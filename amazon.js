const AWS = require("aws-sdk");
const Task = require("./task");

class Amazon {
    constructor() {
        AWS.config.update({region: "us-east-1"});
        this.ecs = new AWS.ECS();
        this.ec2 = new AWS.EC2();
        this.cluster = 'stockfish2';
        this.service = 'stockfish';
        this.task_definition = 'stockfish';
        this.spot_fleet_id = "sfr-72e0e8c3-dcf4-46f0-a654-c07a7092816a";
        this.watchInstances();
        this.watchService();
        this.watchTasks();
    }

    shutdown() {
        console.log("Shutting down, terminating all instances");
        this.setSpotInstanceCount(0);
        console.log("Waiting for all instances to be terminated");
        this.waitForInstances(0);
        console.log("Shutting down watchdogs");
        this.interval.forEach(clearInterval);
    }

    async createStockfishTasks(count) {
        try {
            console.log("Setting up " + count + " tasks. Setting instance count.");
            await this.setSpotInstanceCount(count);
            console.log("Instance count complete. Starting tasks");

            // Just wait for word from the task watchdog to see how many tasks we have
            await new Promise((resolve, reject) => {
                const interval = setInterval(() => {
                    if(this.task_count !== undefined)
                        resolve();
                }, 1000);
            });

            const newcount = count - this.task_count;
            const tencount = Math.floor(newcount / 10);
            const onecount = newcount - (10 * tencount);

            for(let x = 0 ; x < tencount ; x++) {
                console.log("Starting ten tasks");
                const request = this.ecs.runTask({cluster: this.cluster, taskDefinition: this.task_definition, count: 10});
                const data = await request.promise();
                console.log(data);
            }
            if(onecount) {
                console.log("Starting " + onecount + " tasks");
                const request = this.ecs.runTask({cluster: this.cluster, taskDefinition: this.task_definition, count: onecount});
                const data = await request.promise();
                console.log(data);
            }
            console.log("Tasks started");
            return this.ip_addresses.map(ip => new Task(ip, "3010"));
        } catch (e) {
            console.log("promise failed");
            console.log(e);
            throw e;
        }
    }

    waitForService(number) {
        if ((this.service_status === "ACTIVE" && this.service_count === number) || !number) return Promise.resolve();
        return new Promise((resolve, reject) => {
            console.log("Wating for service to become ready with " + number + " running tasks");

            const interval = setInterval(() => {
                if(this.service_count === number) {
                    console.log("All tasks ready");
                    delete this.service_change;
                    clearInterval(interval);
                    resolve();
                }
            }, 1000);


            this.service_change = () => {
                console.log("Waiting for service to become ready with " + number + " running tasks, status=" + this.service_status + ", tasks=" + this.service_count);
            }
        });
    }

    waitForInstances(number) {
        return new Promise((resolve, reject) => {
            console.log("Waiting for " + number + " instances to become ready");
            const interval = setInterval(() => {
                if (!!this.ip_addresses && this.ip_addresses.length === number) {
                    console.log("All instances ready");
                    delete this.instance_change;
                    clearInterval(interval);
                    resolve();
                }
            }, 1000);
        });
    }

    async setSpotInstanceCount(number) {
        try {
            const request = this.ec2.modifySpotFleetRequest({
                SpotFleetRequestId: this.spot_fleet_id,
                TargetCapacity: number
            });
            const data = await request.promise();
            console.log(data);
            await this.waitForInstances(number);
            if(!!number)
                await this.waitForService(number);
        } catch (e) {
            console.log("promise failed");
            console.log(e);
            throw e;
        }
    }

    watchService() {
        const i = setInterval(() => {
            this.ecs.describeServices({cluster: this.cluster, services: [this.service]}, (err, data) => {
                if (err) throw(err);
                if (!this.service_status || this.service_status !== data.services[0].status || data.services[0].runningCount !== this.service_count) {
                    /* A potentially bad change in the service */
                    console.log("service change, previous [status=" + this.service_status + ", count=" + this.service_count + "], new [status=" + data.services[0].status + ", count=" + data.services[0].runningCount + "]");
                    this.service_status = data.services[0].status;
                    this.service_count = data.services[0].runningCount;
                }
            });
        }, 15000);
        if(!this.interval) this.interval = [];
        this.interval.push(i);
    }

    watchInstances() {
        const i = setInterval(() => {
            this.ec2.describeInstances({}, (err, data) => {
                if (err)
                    this.ec2.modifySpotFleetRequest({
                        SpotFleetRequestId: this.spot_fleet_id,
                        TargetCapacity: 0
                    }).promise();
                const ip_addresses = [];
                data.Reservations.forEach(r => {
                    r.Instances.forEach(i => {
                        if (i.State.Name === "running")
                            ip_addresses.push(i.PublicIpAddress)
                    });
                });
                if (!this.ip_addresses || ip_addresses.length !== this.ip_addresses.length) {
                    if(!this.ip_addresses) this.ip_addresses = []; // Yea, I know, lazy way to stop the next line from crashing :)
                    console.log("instance count change, old count=" + this.ip_addresses.length + ", new count=" + ip_addresses.length);
                    /* here we have more or less */
                    this.ip_addresses = ip_addresses;
                }
            });
        }, 15000);
        if(!this.interval) this.interval = [];
        this.interval.push(i);
    }

    watchTasks() {
        const i = setInterval(() => {
            let error;
            this.ecs.listTasks({cluster: this.cluster}, (err, data1) => {
                if(err) error = err;
                else {
                    this.ecs.describeTasks({cluster: this.cluster, tasks: data1.taskArns}, (err, data) => {
                        if (err) error = err;
                        else {
                            let tasks = 0;
                            data.tasks.forEach(t => {
                                if(t.desiredStatus === "RUNNING" && t.lastStatus === "RUNNING" && t.connectivity === "CONNECTED" && t.containers.length && t.containers[0].lastStatus === "RUNNING")
                                    tasks++;
                            });
                            if(!this.task_count || this.task_count !== tasks) {
                                console.log("Change in task count, old=" + this.task_count +", new=" + tasks);
                                this.task_count = tasks;
                            }
                        }
                    });
                }
                if(!!error) {
                    this.ec2.modifySpotFleetRequest({
                        SpotFleetRequestId: this.spot_fleet_id,
                        TargetCapacity: 0
                    }).promise();
                    console.log(error);
                    throw(error);
                }
            });
        }, 15000);
        if(!this.interval) this.interval = [];
        this.interval.push(i);
    }
}

module.exports = Amazon;
