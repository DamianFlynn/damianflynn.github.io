# Defining Policy as Code with ARM Templates


My colleagues and friends [Tao Yang](https://blog.tyang.org/2018/06/06/using-arm-templates-to-deploying-azure-policy-definitions-that-requires-input-parameters/) , and [Stanislav Zhelyazkov](https://cloudadministrator.net/2018/07/17/defining-input-parameters-for-policy-definitions-in-arm-template/) have both recently posts interesting topics on how to implement your Azure Policy as Code which I strongly recommend you take a few moments to review
* [Using ARM Templates to deploy azure policy definitions that require input parameters](https://blog.tyang.org/2018/06/06/using-arm-templates-to-deploying-azure-policy-definitions-that-requires-input-parameters/)
* [Defining input parameters for policy definitions in ARM Templates](https://cloudadministrator.net/2018/07/17/defining-input-parameters-for-policy-definitions-in-arm-template/)

# Improving Readability

Both of these topics address the core of the challenges we face when approaching policy as an Infrastructure as Code problem. However, one of the things that is lost in the translation is the readability of the templates which they are deploying.

Not to reinvent the wheel, I am going to use the same template which Stan presented in his post, and make a small tweak to the process which he has employed to deal with the `'` *single quote* problem!

ARM follows most of the standard JSON escape sequences, therefore the following examples are quite useful

## Escaping a Single quote

Azure ARM behaves nicely with a simply doubling the single quote characters; just as we apply in Visual Basic.

`[concat('This is a ''quoted'' word.')]` which then provides the output of `This is a 'quoted' word.`

### Escaping a Double quote

For the Double quotes, we use the normal escape character `/`.

`[concat('''single'' and \"double\" quotes.')]` will render the output as follows `'single' and "double" quotes.`

## The Solution

With this simple trick, we can replace the *variables* definition which the guys used with the following snippet:

```json
  "variables": {
     "filterVNetId": "[ concat( '[concat(parameters(''virtualNetworkId''),''*'')]' ) ]"
   }
```

I am sure that this is a lot easier to read, and therefor debug; So the full template would look as follows

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "vNetId": {
      "type": "string",
      "defaultValue": "ScreenConnect"
    }
  },
  "variables": {
    "filterVNetId": "[ concat( '[concat(parameters(''virtualNetworkId''),''*'')]' ) ]"
  },
  "resources": [
    {
      "name": "vm-creation-in-approved-vnet-definition",
      "type": "Microsoft.Authorization/policyDefinitions",
      "apiVersion": "2018-03-01",
      "properties": {
        "displayName": "Use approved vNet for VM network interfaces",
        "policyType": "Custom",
        "mode": "All",
        "description": "Use approved vNet for VM network interfaces",
        "metadata": {
          "category": "IaaS"
        },
        "parameters": {
          "virtualNetworkId": {
            "type": "string",
            "metadata": {
              "description": "Resource Id for the vNet",
              "displayName": "vNet Id"
            }
          }
        },
        "policyRule": {
          "if": {
            "allOf": [
              {
                "field": "type",
                "equals": "Microsoft.Network/networkInterfaces"
              },
              {
                "not": {
                  "field": "Microsoft.Network/networkInterfaces/ipconfigurations[*].subnet.id",
                  "like": "[variables('filterVNetId')]"
                }
              }
            ]
          },
          "then": {
            "effect": "deny"
          }
        }
      }
    },
    {
      "name": "vm-creation-in-approved-vnet-assignment",
      "type": "Microsoft.Authorization/policyAssignments",
      "apiVersion": "2018-03-01",
      "dependsOn": [
        "[resourceId('Microsoft.Authorization/policyDefinitions/', 'vm-creation-in-approved-vnet-definition')]"
      ],
      "properties": {
        "displayName": "Use approved vNet for VM network interfaces",
        "description": "Use approved vNet for VM network interfaces",
        "metadata": {
          "assignedBy": "Admin"
        },
        "scope": "[subscription().id]",
        "policyDefinitionId": "[resourceId('Microsoft.Authorization/policyDefinitions', 'vm-creation-in-approved-vnet-definition')]",
        "parameters": {
          "virtualNetworkId": {
            "value": "[parameters('vNetId')]"
          }
        }
      }
    }
  ],
  "outputs": {}
}
```

## Summary

Using native escape sequences in ARM assist in the overall readability of the final code.

Thank you Tao and Stan for the inspiration


