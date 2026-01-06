# Configure VS Code with Azure Cloud Shell


After years living in tools like Visual Studio, and PowerShell; Currently my primary landing ground is Visual Studio Code. With my target audience firmly defined as Azure; In this post I am going to share my notes on how to get these two tools working harmonisly; and to make the experience a little richer, we will also mount the underlying Cloud Drive File Share of the Azure Cloud Shell on our local computer as a PowerShell Drive (PSDrive).

# Azure Cloud Shell in Visual Studio Code

In VSCode we will naviagte to the **Extension** icon and search for **Azure Account**, then install it.

The Azure Account extension provides a single Azure sign-in and subscription filtering experience for all other Azure extensions. This extension also exposes the *Azure’s Cloud Shell* service in VS Code’s integrated terminal.

Once the extension in installed you will see the button to **Reload** your Visual Studio Code instance, which you must complete before we can proceed.

## Sign In to Azure

Now, Open the VS Code command palette (using the key sequence *CTRL, SHIFT + P* or *F1*) and select the option to Sign-in to your Azure Subscription; by typing `Azure: Sign In`

Once you click on Sign-in, Visual Studio Code will launch your browser and you will be naviagted to login to your azure account. Select the appropiate account and complete the authentication process. Once authenticated, the browser window will confirm, and tell you to return to VS Code.

As a confirmation of your autentication state, in the status bar of VS Code a new element which is prefixed with the word **Azure:** and postfixed with the account you just authenticated with will be presented.

## Cloud Shell in VS Code

Now that we are signed in, launch the VSCode command palette again (CTRL, SHIFT+P or F1), this time typing `Azure: Open PowerShell in Cloud Shell` or `Azure: Open Bash in Cloud Shell`

> Note: This extension requires Node.JS; If not found on your system, you will be prompted to remediate.

VSCode will update the status bar to indicate it is activating the extenstion, If your account is determined to have access to mulitple Azure AD Directories, you will be prompted to select the directory you wish to work in for this session from the drop down list.

After a few moments you will then observe the **Terminal** window launch, and the session will be be entitled as *PowerShell in Cloud Shell*.

```powershell
Select directory...
Requesting a Cloud Shell...
Connecting terminal...
Welcome to Azure Cloud Shell
Type "az" to use Azure CLI 2.0
Type "help" to learn about Cloud Shell
VERBOSE: Authenticating to Azure ...
VERBOSE: Building your Azure drive ...
Azure:/PS Azure:\>
```

## Mount Azure Cloud Shell drive Locally

For the best flexibility you will regularly have the requirement of interacting with the files in the Cloud Drive, directly from your local working environment.

Launch your browser, and authenticate to https://portal.azure.com

1. Locate the Resource Group which contains the Cloud Shell Storage
1. Open the Storage Account and select the Files Service
1. Inspect the names of the presented File Shares, and select the name which contains your chosen authentication account, eg cs-technology-damianflynn-com-1001100110011001
1. Finally, On the File share blade, you will select the ‘Connect’ button, which will present a new blade to the right of the window.
1. In the blade, choose a Drive letter and then copy the auto-generated PowerShell Commands to map your Cloud Drive.
In a powershell session on your local machine, paste the copied commands; which will automatically mount the cloud drive to your chosen drive letter on your local computer.

From here you can now access and interact with the cloud drive, making changes which will appear real time in the Cloud Shell.

Enjoy!


