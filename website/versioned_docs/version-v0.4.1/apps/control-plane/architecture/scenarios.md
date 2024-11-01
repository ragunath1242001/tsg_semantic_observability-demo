# Scenarios

## Use Case: Data Plane management.

**Actors**: Control Plane Administrator

**Scope**: Software system

**Purpose**: Manage used Data Planes in the Control Plane

**Type**: Primary

**Overview**: As a Control Plane administrator I must be able to manage the Data Planes used in the instance

### Typical course of events:

| Actor Action                                                 | System Response                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 1. The admin logs in into the Control Plane via the Admin UI | 2. The Control Plane creates a user session                               |
| 3. The admin requests a list of Data Planes in use           | 4. The Control Plane provides the list of Data Planes                     |
| 5. The admin removes an existing Data Plane                  | 6. The Control Plane removes the Data Plane from the database             |
| 7. The admin creates a new Data Plane via the UI             | 8. The Data Plane material is generated based on the request of the admin |

### Alternative Courses:

2a. The user credentials provided are not allowed to manage Data Planes

8a. The provided configuration is not valid to create a new Data Plane
