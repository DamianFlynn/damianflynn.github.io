# Azure IaC - Appending Tags


**Dynamically appending Tags to our ARM template with the union function**

Todays conundrum: As I am leveraging templates, there will always be some standard tags I require to implement within the template, but I also require to provide additional tags as a parameter to be appended with the deployment.

My objective is to set up tags within an ARM template in accordance with good governance and the Cloud adoption framework.

# Solution

ARM Template functions to the rescue. Todays salvation is called `union`, which you can learn more about on the actual [reference Site](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-template-functions-array#union)

This is the existing implementation

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "configVersion": {
      "type": "string",
      "defaultValue": "1.0.0.0",
      "metadata": {
        "description": "The version of the parameters file that holds the configuration."
      }
    },
    "purpose": {
      "type": "string",
      "allowedValues": [
        "diag",
        "log",
        "audit",
        "data"
      ],
      "defaultValue": "data",
      "metadata": {
        "description": "The designated purpose of the storage account. 'diag' for diagnostics, 'log' for logging, 'audit' for auditing, 'data' for data storage"
      }
    },
    "resilience": {
      "type": "string",
      "allowedValues": [
        "Standard_LRS",
        "Standard_ZRS",
        "Standard_GRS",
        "Standard_RAGRS"
      ],
      "defaultValue": "Standard_LRS",
      "metadata": {
        "description": "Choose a level of resilience and tier suitable for the purpose and region"
      }
    },
    "tier": {
      "type": "string",
      "allowedValues": [
        "Standard",
        "Premium"
      ],
      "defaultValue": "Standard",
      "metadata": {
        "description": "Choose tier, Standard or Premium."
      }
    },
    "kind": {
      "type": "string",
      "allowedValues": [
        "Storage",
        "StorageV2",
        "BlobStorage",
        "FileStorage",
        "BlockBlobStorage"
      ],
      "defaultValue": "StorageV2",
      "metadata": {
        "description": "Choose a kind of storage account"
      }
    }
  },
  "variables": {
    "iacVersion": "undefined",
    "rgName": "[resourceGroup().name]",
    "rgLocation": "[resourceGroup().location]",
    "uniqueString": "[uniqueString(subscription().id, resourceGroup().id)]",
    "storageAccountAffix": "[concat(replace(variables('rgName'), '-', ''), parameters('purpose'))]",
    "storageAccountName": "[toLower(substring(replace(concat(variables('storageAccountAffix'), variables('uniqueString')), '-', ''), 0, 23) )]"
  },
  "resources": [
    {
      "comments": "~~ Storage Account  ~~",
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2018-07-01",
      "name": "[variables('storageAccountName')]",
      "sku": {
        "name": "[parameters('resilience')]",
        "tier": "[parameters('tier')]"
      },
      "kind": "[parameters('kind')]",
      "location": "[variables('rgLocation')]",
      "tags": {
        "IaCVersion": "[variables('iacVersion')]",
        "ConfigVersion": "[parameters('configVersion')]"
      },
      "scale": null,
      "properties": {
        "supportsHttpsTrafficOnly": true,
        "encryption": {
          "services": {
            "file": {
              "keyType": "Account",
              "enabled": true
            },
            "blob": {
              "keyType": "Account",
              "enabled": true
            }
          },
          "keySource": "Microsoft.Storage"
        },
        "accessTier": "[if(equals(parameters('kind'), 'Storage'), json('null'),'Hot')]"
      },
      "dependsOn": [
      ]
    }
  ],
  "outputs": {
    "storageId": {
      "type": "string",
      "value": "[resourceId('Microsoft.Storage/storageAccounts', variables('storageAccountName'))]"
    },
    "storageAccountName": {
      "type": "string",
      "value": "[variables('storageAccountName')]"
    }
  }
}
```

## The Change Set

And using our new `union` we can resolve the puzzle with 3 simple changes

1. To the parameter we add a new object
  ```json
      "tagValues": {
        "type": "object",
        "defaultValue": {
          "Dept": "Undefined",
          "Environment": "Development"
        }
      },
  ```
  
  1. In the variables we can define our default tags
  ```json
      "defaultTag": {
        "IaCVersion": "[variables('iacVersion')]",
        "ConfigVersion": "[parameters('configVersion')]"
      },
  ```
  
  1. And in the resource we can use the union function to merge the objects together
  ```json
    "tags": "[union(parameters('tagValues'),variables('defaultTag'))]",
  ```
  
  ## The Final Result

The final template will look as follows

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "configVersion": {
      "type": "string",
      "defaultValue": "1.0.0.0",
      "metadata": {
        "description": "The version of the parameters file that holds the configuration."
      }
    },
    "tagValues": {
      "type": "object",
      "defaultValue": {
        "Dept": "Undefined",
        "Environment": "Development"
      }
    },
    "purpose": {
      "type": "string",
      "allowedValues": [
        "diag",
        "log",
        "audit",
        "data"
      ],
      "defaultValue": "data",
      "metadata": {
        "description": "The designated purpose of the storage account. 'diag' for diagnostics, 'log' for logging, 'audit' for auditing, 'data' for data storage"
      }
    },
    "resilience": {
      "type": "string",
      "allowedValues": [
        "Standard_LRS",
        "Standard_ZRS",
        "Standard_GRS",
        "Standard_RAGRS"
      ],
      "defaultValue": "Standard_LRS",
      "metadata": {
        "description": "Choose a level of resilience and tier suitable for the purpose and region"
      }
    },
    "tier": {
      "type": "string",
      "allowedValues": [
        "Standard",
        "Premium"
      ],
      "defaultValue": "Standard",
      "metadata": {
        "description": "Choose tier, Standard or Premium."
      }
    },
    "kind": {
      "type": "string",
      "allowedValues": [
        "Storage",
        "StorageV2",
        "BlobStorage",
        "FileStorage",
        "BlockBlobStorage"
      ],
      "defaultValue": "StorageV2",
      "metadata": {
        "description": "Choose a kind of storage account"
      }
    }
  },
  "variables": {
    "iacVersion": "undefined",
    "defaultTag": {
      "IaCVersion": "[variables('iacVersion')]",
      "ConfigVersion": "[parameters('configVersion')]"
    },
    "rgName": "[resourceGroup().name]",
    "rgLocation": "[resourceGroup().location]",
    "uniqueString": "[uniqueString(subscription().id, resourceGroup().id)]",
    "storageAccountAffix": "[concat(replace(variables('rgName'), '-', ''), parameters('purpose'))]",
    "storageAccountName": "[toLower(substring(replace(concat(variables('storageAccountAffix'), variables('uniqueString')), '-', ''), 0, 23) )]"
  },
  "resources": [
    {
      "comments": "~~ Storage Account  ~~",
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2018-07-01",
      "name": "[variables('storageAccountName')]",
      "sku": {
        "name": "[parameters('resilience')]",
        "tier": "[parameters('tier')]"
      },
      "kind": "[parameters('kind')]",
      "location": "[variables('rgLocation')]",
      "tags": "[union(parameters('tagValues'),variables('defaultTag'))]",
      "scale": null,
      "properties": {
        "supportsHttpsTrafficOnly": true,
        "encryption": {
          "services": {
            "file": {
              "keyType": "Account",
              "enabled": true
            },
            "blob": {
              "keyType": "Account",
              "enabled": true
            }
          },
          "keySource": "Microsoft.Storage"
        },
        "accessTier": "[if(equals(parameters('kind'), 'Storage'), json('null'),'Hot')]"
      },
      "dependsOn": [
      ]
    }
  ],
  "outputs": {
    "storageId": {
      "type": "string",
      "value": "[resourceId('Microsoft.Storage/storageAccounts', variables('storageAccountName'))]"
    },
    "storageAccountName": {
      "type": "string",
      "value": "[variables('storageAccountName')]"
    }
  }
}
```

Now, Feel the force, and see what you can create…


