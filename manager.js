const Amazon = require('./amazon');
//AWS.config.getCredentials((err) => {
//     if(err) console.log(err.stack);
// });

const amazon = new Amazon();
amazon.setSpotInstanceCount(0)
    .then(() => amazon.shutdown());
//process.exit(0);
// amazon.createStockfishTasks(2)
//     .then(() => console.log("here"))
//     .then(() => amazon.shutdown())
//     .then(() => console.log("end!"));

//getIPForInstance("i-04e13fcfe78b46536");
//spotTest();
//setSpotInstances(0);

//spotTest();
//{
//   clusters: [
//     {
//       clusterArn: 'arn:aws:ecs:us-east-1:673243812987:cluster/stockfish',
//       clusterName: 'stockfish',
//       status: 'ACTIVE',
//       registeredContainerInstancesCount: 1,
//       runningTasksCount: 0,
//       pendingTasksCount: 0,
//       activeServicesCount: 1,
//       statistics: [],
//       tags: [],
//       settings: [Array],
//       capacityProviders: [],
//       defaultCapacityProviderStrategy: []
//     }
//   ],
//   failures: []
// }
//
//---------------------------------------------------------------------------------------------------------------------
//
//{
//   services: [
//     {
//       serviceArn: 'arn:aws:ecs:us-east-1:673243812987:service/stockfish',
//       serviceName: 'stockfish',
//       clusterArn: 'arn:aws:ecs:us-east-1:673243812987:cluster/stockfish',
//       loadBalancers: [],
//       serviceRegistries: [],
//       status: 'ACTIVE',
//       desiredCount: 0,
//       runningCount: 0,
//       pendingCount: 0,
//       launchType: 'EC2',
//       taskDefinition: 'arn:aws:ecs:us-east-1:673243812987:task-definition/stockfish:1',
//       deploymentConfiguration: [Object],
//       deployments: [Array],
//       events: [Array],
//       createdAt: 2020-06-09T20:46:42.513Z,
//       placementConstraints: [],
//       placementStrategy: [Array],
//       schedulingStrategy: 'REPLICA',
//       enableECSManagedTags: false,
//       propagateTags: 'NONE'
//     }
//   ],
//   failures: []
// }
//
//
//{
//   ActiveInstances: [
//     {
//       InstanceId: 'i-04e13fcfe78b46536',
//       InstanceType: 'c3.4xlarge',
//       SpotInstanceRequestId: 'sir-926sgj5j',
//       InstanceHealth: 'healthy'
//     },
//     {
//       InstanceId: 'i-0f19fd7b2a4d57142',
//       InstanceType: 'c3.4xlarge',
//       SpotInstanceRequestId: 'sir-e2x9g2th',
//       InstanceHealth: 'healthy'
//     },
//     {
//       InstanceId: 'i-02e37d26a1eebca60',
//       InstanceType: 'c4.xlarge',
//       SpotInstanceRequestId: 'sir-jbnhhj6h',
//       InstanceHealth: 'healthy'
//     }
//   ],
//   SpotFleetRequestId: 'sfr-61bdfa16-a176-4472-85a4-1b3569cf413c'
// }
//
