# Azure IaC - Function Keys


Todays conundrum: As I deploy a new Function Application, I need a simple methodology to retrieve the Host Keys for the function application so that I validate the deployment has been successful; and potentially pass on the key to related services, for example API Management.

As before, I am leveraging templates, and will stay cloud native; this time depending on the functions Output ability to present the keys.

<!--more-->
#Azure #APIManagement #Publish
## Solution

A not well know ARM resource is going to be our Hero in this journey. The resource is a called `Microsoft.Web/sites/host/functionKeys` and you can gain a little (actually almost none) more details on the Microsoft [reference site](https://docs.microsoft.com/en-us/azure/templates/microsoft.web/2018-02-01/sites/functions/keys). 

 > 
 > The Documentation refer the API release 2018-02-01; But as you will see in the example code; I discovered that a slightly newer version available.

The Key to this deployment is the following resource definition

````json
    "resources": [
        {
            "comments": "~~ Function App Keys  ~~",
            "type": "Microsoft.Web/sites/host/functionKeys",
            "apiVersion": "2018-11-01",
            "name": "[concat(variables('webappName'), '/default/apimanagement')]",
            "dependsOn": [
                "[resourceId('Microsoft.Web/sites/', variables('webappName'))]"
            ],
            "properties": {
                "name": "api-management"
            }
        }
    ]
````

Let's inspect this closer

|Lines|Description|
|-----|-----------|
|2|A simple comment defining the objective of this resource|
|3|The Resource type we are deploying|
|4|The Current API Version of the resource; Normally extracted from the Documentation.|
|5|The Name of the resource, In this case we are defining a sub-resource of a `Microsoft.Web/sites`; therefore the name is defined as {resourcename}/host/{Function Apps, Host Level Key Name}|
|6-8|Ensure that the Function App has been deployed before we attempt to create the Function App Host Key|
|9-11|Set the name for the Host Key we are creating|

After this resource has been deployed, we then will reference this in our template `output` section

````json
    "outputs": {
        "functionKey": {
            "type": "string",
            "value": "[listkeys(concat(resourceId('Microsoft.Web/sites', variables('webappName')), '/host/default/'),'2016-08-01').functionKeys.apimanagement]"
        }
    }
````

In the `value` section of this output, we are getting a reference to the Function Applications resource identity we just deployed, and with this leverage the ARM Function of `listkeys` to return the function key for the resource we identified on Line 5 in the earlier snippet.

With this output, we can now chain this as the input for additional templates, or reference the value for our scripts.

---

<!-- merged-variant: public/share/iac-arm-functionapp_keys.md -->
## Merged variant — `public/share/iac-arm-functionapp_keys.md`

# Get the Function Keys using ARM

Todays conundrum: As I deploy a new [Function Application](/posts/azure-functions-scaffolding/), I need a simple methodology to retrieve the Host Keys for the function application so that I validate the deployment has been successful; and potentially pass on the key to related services, for example API Management.

As before, I am leveraging templates, and will stay cloud native; this time depending on the functions Output ability to present the keys.
<!--more-->
## Solution

A not well know ARM resource is going to be our Hero in this journey. The resource is a called `Microsoft.Web/sites/host/functionKeys` and you can gain a little (actually almost none) more details on the Microsoft [reference site](https://docs.microsoft.com/en-us/azure/templates/microsoft.web/2018-02-01/sites/functions/keys). 

> The Documentation refer the API release 2018-02-01; But as you will see in the example code; I discovered that a slightly newer version available.

The Key to this deployment is the following resource definition

```json
    "resources": [
        {
            "comments": "~~ Function App Keys  ~~",
            "type": "Microsoft.Web/sites/host/functionKeys",
            "apiVersion": "2018-11-01",
            "name": "[concat(variables('webappName'), '/default/apimanagement')]",
            "dependsOn": [
                "[resourceId('Microsoft.Web/sites/', variables('webappName'))]"
            ],
            "properties": {
                "name": "api-management"
            }
        }
    ]
```

Let's inspect this closer

|Lines | Description|
|---|---|
| 2 | A simple comment defining the objective of this resource
| 3 | The Resource type we are deploying
| 4 | The Current API Version of the resource; Normally extracted from the Documentation.
| 5 | The Name of the resource, In this case we are defining a sub-resource of a `Microsoft.Web/sites`; therefore the name is defined as {resourcename}/host/{Function Apps, Host Level Key Name}
|6-8| Ensure that the Function App has been deployed before we attempt to create the Function App Host Key
|9-11|Set the name for the Host Key we are creating

After this resource has been deployed, we then will reference this in our template `output` section

```json
    "outputs": {
        "functionKey": {
            "type": "string",
            "value": "[listkeys(concat(resourceId('Microsoft.Web/sites', variables('webappName')), '/host/default/'),'2016-08-01').functionKeys.apimanagement]"
        }
    }
```

In the `value` section of this output, we are getting a reference to the Function Applications resource identity we just deployed, and with this leverage the ARM Function of `listkeys` to return the function key for the resource we identified on Line 5 in the earlier snippet.

With this output, we can now chain this as the input for additional templates, or reference the value for our scripts.

---
<!-- enrich:containment -->
*Part of: damianflynn*

