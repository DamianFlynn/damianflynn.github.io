# Managed Applications and Custom Resource Providers


Magnify the power of extending Azure platform by enabling customers and partners to easily bring in custom solutions to azure. These can be scoped for offering to our own enterprise, or just some selected customers; or even all customers.

  Challenges with extending azure include many of the typical thoughts we face

* As part of my deployment i need to do extra works
* Need to interface with external APIs, create users, storage tables, calling APIs external to Azure, while deploying ARM templates
* 200 Services, which service should i be selected, What is the correct VM SKU? what would be more cost efficient
* How do I integrate my service into Azure; What is the correct option to expose my service to my enterprise, or all azure users
# How do we deploy and offer?

## Deployment Script

**New** resource type - `Microsoft.Resources/DeploymentScripts`

* Allows running any scripts, Azure CLI, Powershell,
* Content can be provided in line of using a URI
* Can also execute Pre or Post configuration on ARM resources,
* Fire and forget resource type, configurable auto-deletion of this, should it be deleted, and if so when?
## Azure Service Catalog

**Service Catalog** blade: Enable applications development teams to be more successful with the right services and scope the selections offered
Used in conjunction with Policy and RBAC, supports the compliance with the organization standard. Customized the creation experience for services and solutions

Applications are managed by a Central IT / Support Team

## Custom Resource Providers

Organizations want to extend ARM and Azure management to the services they user, both custom and 3rd party build.
Partners want to extend their custom resources directly into Azure for their customers
Managed app developers need to give some control to their custom resources, for example integrate a SaaS service in Azure, examples include DataDog or Service Now.

Any REST endpoint can be called from the new Custom Provider Endpoint.

Any API can be extended into Azure, with RBAC Policy, Activity Log etc.
Partners can have full control with governances, policy and templates for these services

> VSCode Managed Application extension is currently in Private Preview

Azure Policy extension allows the ability to link the resource with the managed application, so that each time a new resource is deployed the managed application can process the details.

* Enabled management access out of the box,
* Easy access to author, no code needed to extend azure
* Monotised through the application lifecycle.
* Managed application has full access to the target subscription when deployed.
# Partners - Managed Applications Center

See, manage, and deploy all instances of the applications which may be deployed, managed as scale across tenants.

Cloud Partner portal, new offer under Managed Applications, new SKU.

Include the packaged file for the Managed Application, with the tenant ID, and the view definitions.

Define who will have access - reader, contributor, etc. - that can cross-tenant manage these services.

How to bill, using a private preview (opened in December 2019) using customer metering that can be built on any measure; with price per unit, and amount offered as part of the base prices. Can be up to 18 line items for the application, with different prices by SKUs and users.Private Offers also supported for per-customer pricing.

## Resource Providers

Building a full-blown resource provider in Azure. Most powerful mechanism to deliver your service in Azure.

220+ RPs currently in Azure, first-party account for 90%

Expose resource types specific to your service, including CRUD, etc.

Get all the benefits of the ARM environment, including RBAC, Policy, etc.

## Why?

Custom use native Azure services AND partner Services.

Homogeneous experience across services

Capabilities parity across services and custom billing based on Azure billingLeverage Azure Arc to provide capabilities over resources on on-premises resources.

Custom views for the Custom resource providers


