const AWS = require("aws-sdk");

class Amazon {
    constructor() {
        AWS.config.update({region: "us-east-1"});
        this.ecs = new AWS.ECS();
        this.ec2 = new AWS.EC2();
        this.cluster = 'stockfish2';
        this.service = 'stockfish';
        this.task_definition = 'stockfish';
        this.spot_fleet_id = "sfr-72e0e8c3-dcf4-46f0-a654-c07a7092816a";
        this.ip_addresses = [];
        this.watchInstances();
        this.watchService();
    }

    shutdown() {
        this.setSpotInstanceCount(0);
        this.waitForInstances(0);
        this.interval.stop();
        this.interval2.stop();
    }

    async createStockfishTasks(count) {
        try {
            await this.setSpotInstanceCount(count);
            const tencount = Math.floor(count / 10);
            const onecount = count - (10 * tencount);
            for(let x = 0 ; x < tencount ; x++) {
                const request = this.ecs.runTask({cluster: this.cluster, taskDefinition: this.task_definition, count: 10});
                const data = await request.promise();
                console.log(data);
            }
            if(onecount) {
                const request = this.ecs.runTask({cluster: this.cluster, taskDefinition: this.task_definition, count: onecount});
                const data = await request.promise();
                console.log(data);
            }
        } catch (e) {
            console.log("promise failed");
            throw e;
        }
    }

    waitForService(number) {
        if (this.service_status === "ACTIVE" || !number) return Promise.resolve();
        return new Promise((resolve, reject) => {
            this.service_change = () => {
                if(this.service_count === number) {
                    delete this.service_change;
                    resolve();
                }
            }
        });
    }

    waitForInstances(number) {
        return new Promise((resolve, reject) => {
            this.instance_change = () => {
                if (this.ip_addresses.length === number) {
                    delete this.instance_change;
                    resolve();
                }
            }
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
            throw e;
        }
    }

    watchService() {
        this.interval2 = setInterval(() => {
            this.ecs.describeServices({cluster: this.cluster, services: [this.service]}, (err, data) => {
                if (err) throw(err);
                if (!this.service_status || this.service_status !== data.services[0].status || data.services[0].runningCount !== this.service_count) {
                    /* A potentially bad change in the service */
                    this.service_status = data.services[0].status;
                    this.service_count = data.services[0].runningCount;
                    if (!!this.service_change)
                        this.service_change();
                }
            });
        }, 15000);
    }

    watchInstances() {
        this.interval = setInterval(() => {
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
                            this.ip_addresses.push(i.PublicIpAddress)
                    });
                });
                if (ip_addresses.length !== this.ip_addresses.length) {
                    /* here we have more or less */
                    if (!!this.instance_change)
                        this.instance_change();
                    this.ip_addresses = ip_addresses;
                }
            });
        }, 15000);
    }
}

module.exports = Amazon;
