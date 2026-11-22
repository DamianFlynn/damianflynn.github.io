# Getting Azure Function Keys with ARM Templates


Today's conundrum: I've deployed a new [Function Application](/posts/azure-functions-scaffolding/), and another service needs a key to call it. API Management is a good example. The infrastructure deployment should prepare that integration without someone opening the portal, copying a key and pasting it into the next configuration step.

ARM templates can create a named host key and retrieve its value through `listKeys`. Giving the integration its own named key also makes its purpose clearer than reusing a generic default key.

The examples below show the resource definition and the lookup used in my original deployment. They are fragments to merge into an existing Function App template, not a complete deployment on their own.

<!--more-->

## Create a named host key

The resource type is `Microsoft.Web/sites/host/functionKeys`. This creates a key at the **Function App host level**, rather than a key scoped to one individual function.

A host key can authorise calls to functions in that app that accept function keys. Choose that scope deliberately: a function-specific key is a narrower option when an integration only needs one function. A host key is also distinct from the host's administrative master key; the example does not retrieve the master key.

In this fragment, `webappName` is an existing template variable containing the Function App's name. The Function App itself is declared elsewhere in the same template:

```json
{
  "resources": [
    {
      "comments": "Create a dedicated host key for API Management",
      "type": "Microsoft.Web/sites/host/functionKeys",
      "apiVersion": "2018-11-01",
      "name": "[concat(variables('webappName'), '/default/apimanagement')]",
      "dependsOn": [
        "[resourceId('Microsoft.Web/sites', variables('webappName'))]"
      ],
      "properties": {
        "name": "apimanagement"
      }
    }
  ]
}
```

The resource name has three parts:

```text
<function-app-name>/default/apimanagement
```

The first identifies the Function App. `default` identifies the host resource, and `apimanagement` names the key. Keep that final segment consistent with `properties.name` and with the lookup used later.

`dependsOn` orders key creation after the Function App resource. It does not deploy the function code or prove that an HTTP endpoint is ready to serve requests. If code deployment happens in another stage, arrange the integration and testing stages accordingly.

These API versions are retained from the original working example: `2018-11-01` for the key resource and `2016-08-01` for the lookup below. They are historical choices, not a claim that they are the latest recommended versions. Check the [Microsoft.Web template reference](https://learn.microsoft.com/en-us/azure/templates/microsoft.web/) and your target environment when adapting the example.

## Retrieve the key with `listKeys`

Once the named key exists, ARM can query the host's keys and select it from the `functionKeys` object.

> **Treat the result as a secret.** The ordinary string output below demonstrates the lookup used in the original template. It can expose the key through deployment history and through tools or pipeline logs that print outputs. Don't use a plain deployment output as a production secret-transfer mechanism. Prefer consuming the value directly in the dependent resource's configuration, where supported, or using an appropriately secured secret store such as Key Vault. Review the destination's secret-handling behaviour too.

The original output pattern is:

```json
{
  "outputs": {
    "functionKey": {
      "type": "string",
      "value": "[listKeys(concat(resourceId('Microsoft.Web/sites', variables('webappName')), '/host/default/'), '2016-08-01').functionKeys.apimanagement]"
    }
  }
}
```

The expression does three things:

1. `resourceId('Microsoft.Web/sites', variables('webappName'))` identifies the Function App in the deployment's resource group.
2. Appending `/host/default/` identifies its host for the `listKeys` operation.
3. `.functionKeys.apimanagement` selects the named key from the returned object.

The deployment identity needs permission to perform the key-listing operation. A successful deployment of an unrelated resource does not imply that the identity can read Function App keys.

If you adapt this lookup for another resource in the template, make that consumer depend on the named key's creation. In a separate deployment stage, run the lookup only after the key-creation stage succeeds. The consumer should not race the resource that creates the key it needs.

## Use the key to complete the integration

For API Management, the next step is to place the key in the integration's protected configuration and use it when calling the Function App. Avoid copying it into source-controlled policy text or printing it during deployment.

Retrieving a key confirms that the key-management operation succeeded; it does not validate the function's behaviour. To validate the deployment, make a separate request to the intended endpoint and check the response. Keep the key out of request logs and diagnostic output while doing so.

The useful part of this pattern is that key creation and lookup can be part of the deployment process. Keep the key name consistent, choose the narrowest appropriate scope, and handle its value as a credential throughout the handover to the consuming service.

---
<!-- enrich:containment -->
*Part of: damianflynn*

