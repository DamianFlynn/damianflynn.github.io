# Bicep - Tags as Parameters


In an earlier post, we look at using ARM to lookup the value of Tags' at both at the Subscription and Resource Level.

With Bicep this is much easier to understand. This is the same lab configuration as in the original post, but this time to code should be a lot more readable.

```powershell
// Sample to lookup tag values 
// Both Subscription and Resource Level

@description('The resource ID of the resource we wish to look up a tag from.')
param sourceResourceId string = '/subscriptions/547d54ea-411b-459e-b6f8-b3cc5e84c535/resourceGroups/p-vm/providers/Microsoft.Compute/virtualMachines/p-vm001'


// Variables to reference the Tags Resource Providers

// Subscription Tags Resource Provider
var referenceSubscriptionTagsResourceId = '/subscriptions/${subscription().subscriptionId}/providers/Microsoft.Resources/tags/default'

// Resource Tags Resource Provider
var referenceResourceTagsResourceId = '${sourceResourceId}/providers/Microsoft.Resources/tags/default'
var referenceTagsApi = '2020-06-01'


// 
// Lookup the tags and return the value
// 

// Subscription Tags
output subscriptionRecoveryVaultRGTag string = reference(referenceSubscriptionTagsResourceId, referenceTagsApi).tags.recoveryVaultRG
output subscriptionRecoveryVaultTag string = reference(referenceSubscriptionTagsResourceId, referenceTagsApi).tags.recoveryVault

// Resource Tags
output resourceRecoveryPolicyTag string = reference(referenceResourceTagsResourceId, referenceTagsApi).tags.recoveryPolicy


// Concatanation of the outputs to build Resource Ids

output recoveryVaultId string = resourceId(subscription().subscriptionId, reference(referenceSubscriptionTagsResourceId, referenceTagsApi).tags.recoveryVaultRG, 'Microsoft.RecoveryServices/vaults', reference(referenceSubscriptionTagsResourceId, referenceTagsApi).tags.recoveryVault)
output recoveryPolicyId string = '${resourceId(subscription().subscriptionId, reference(referenceSubscriptionTagsResourceId, referenceTagsApi).tags.recoveryVaultRG, 'Microsoft.RecoveryServices/vaults', reference(referenceSubscriptionTagsResourceId, referenceTagsApi).tags.recoveryVault)}/backupPolicies/${reference(referenceResourceTagsResourceId, referenceTagsApi).tags.recoveryPolicy}'

```

---
<!-- enrich:containment -->
*Part of: damianflynn*

