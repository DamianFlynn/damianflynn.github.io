# Azure Functions Scaffolding


Most of my time is spent working on Governance in Azure; and while the cloud native plumbing is amzaing, there are still some gaps which need to be filled, and my go-to tool of choice is Azure Functions.

One of the products which I oversee the devleopment of is called the 'Concierge' and recently maintaining it has been a challange instead of a joy. It was architected with Fuctions v1 principals, and its well time for a look inside the tool box.

This post will cover the initial template we get with a V3 Function, and I will extend this with some of the principals which are really important to ensure that as the abilities of the app expand; we will still be able to mainaint and support the code.

# Starting Template

The function runtime is controlled by a file called `host.json`; and this will control simple yet, extremly important featuers such as logging. In its default form we are offered

````json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingExcludedTypes": "Request",
      "samplingSettings": {
        "isEnabled": true
      }
    }
  }
}
````

THis is accompanised with a file to define the environment variables `local.settings.json`

````json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet"
  }
}
````

## HTTP Trigger Function

The initial template created for a HTTP Trigger function will include the function itself `function1.cs`

````cs
using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Custodian
{
  public static class Function1
  {
    [FunctionName("Function1")]
    public static async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)] HttpRequest req,
        ILogger log)
    {
      log.LogInformation("C# HTTP trigger function processed a request.");

      string name = req.Query["name"];

      string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
      dynamic data = JsonConvert.DeserializeObject(requestBody);
      name = name ?? data?.name;

      string responseMessage = string.IsNullOrEmpty(name)
          ? "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response."
          : $"Hello, {name}. This HTTP triggered function executed successfully.";

      return new OkObjectResult(responseMessage);
    }
  }
}
````

# Introduce Direct Injection

Add to the CSProject file `Custodian.csproj`

* Update the `Microsoft.NET.Sdk.Functions` to 3.0.7
* Add `Microsoft.Azure.Functions.Extensions` 1.0.0
* Add `Microsoft.Extensions.Http` 3.1.4

````xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netcoreapp3.1</TargetFramework>
    <AzureFunctionsVersion>v3</AzureFunctionsVersion>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Azure.Functions.Extensions" Version="1.0.0" />
    <PackageReference Include="Microsoft.Extensions.Http" Version="3.1.4" />
    <PackageReference Include="Microsoft.NET.Sdk.Functions" Version="3.0.7" />
  </ItemGroup>
  <ItemGroup>
    <None Update="host.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
    <None Update="local.settings.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <CopyToPublishDirectory>Never</CopyToPublishDirectory>
    </None>
  </ItemGroup>
</Project>
````

The function runtime is controlled by a file called `host.json`; and this will control simple yet, extremly important featuers such as logging. In its default form we are offered

````json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 5
      }
    },
    "fileLoggingMode": "debugOnly",
    "logLevel": {
      "default": "Trace"
    }
  }
}
````

This is accompanied with a file to define the environment variables `local.settings.json`

````json
{
    "IsEncrypted": false,
    "Values": {
        "AzureWebJobsStorage": "UseDevelopmentStorage=true",
        "FUNCTIONS_WORKER_RUNTIME": "dotnet"
    }
}
````

Add a `startup.cs`

````cs
using Microsoft.Azure.Functions.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;


[assembly: FunctionsStartup(typeof(AzureFunctionDependencyInjection.Startup))]
namespace AzureFunctionDependencyInjection
{
  public class Startup : FunctionsStartup
  {
    public override void Configure(IFunctionsHostBuilder builder)
    {
      builder.Services.AddHttpClient();
    }
  }
}
````

## HTTP Trigger Function

The initial template created for a HTTP Trigger function will include the function itself `function1.cs`

````cs
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Microsoft.Extensions.Configuration;

namespace Custodian
{

  public class Function1
  {
    private readonly ILogger<Function1> _Logger;
    private readonly IConfiguration _Configuration;

    public Function1(ILogger<Function1> logger, IConfiguration config)
    {
      _Logger = logger;
      _Configuration = config;
    }

    [FunctionName("Function1")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)] HttpRequest req)
    {
      _Logger.LogTrace("Trace - C# HTTP trigger function processed a request.");
      _Logger.LogDebug("Debug - C# HTTP trigger function processed a request.");
      _Logger.LogInformation("Information - C# HTTP trigger function processed a request.");
      _Logger.LogWarning("Warning - C# HTTP trigger function processed a request.");
      _Logger.LogError("Error - C# HTTP trigger function processed a request.");
      _Logger.LogCritical("Critical - C# HTTP trigger function processed a request.");

      string name = req.Query["name"];

      string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
      dynamic data = JsonConvert.DeserializeObject(requestBody);
      name = name ?? data?.name;

      string responseMessage = string.IsNullOrEmpty(name)
          ? "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response."
          : $"Hello, {name}. This HTTP triggered function executed successfully.";

      return new OkObjectResult(responseMessage);
    }
  }
}
````

---

<!-- merged-variant: public/share/iac-arm-functionapp_scaffold.md -->
## Merged variant — `public/share/iac-arm-functionapp_scaffold.md`

# Deploy Azure Function App with ARM

Most of my time is spent working on Governance in Azure; and while the cloud native plumbing is amzaing, there are still some gaps which need to be filled, and my go-to tool of choice is Azure Functions.

One of the products which I oversee the devleopment of is called the 'Concierge' and recently maintaining it has been a challange instead of a joy. It was architected with Fuctions v1 principals, and its well time for a look inside the tool box.

This post will cover the initial template we get with a V3 Function, and I will extend this with some of the principals which are really important to ensure that as the abilities of the app expand; we will still be able to mainaint and support the code.

## Starting Template

The function runtime is controlled by a file called `host.json`; and this will control simple yet, extremly important featuers such as logging. In its default form we are offered

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingExcludedTypes": "Request",
      "samplingSettings": {
        "isEnabled": true
      }
    }
  }
}
```
 
This is accompanised with a file to define the environment variables `local.settings.json`

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet"
  }
}
```



## HTTP Trigger Function
The initial template created for a HTTP Trigger function will include the function itself `function1.cs`

```cs
using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Custodian
{
  public static class Function1
  {
    [FunctionName("Function1")]
    public static async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)] HttpRequest req,
        ILogger log)
    {
      log.LogInformation("C# HTTP trigger function processed a request.");

      string name = req.Query["name"];

      string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
      dynamic data = JsonConvert.DeserializeObject(requestBody);
      name = name ?? data?.name;

      string responseMessage = string.IsNullOrEmpty(name)
          ? "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response."
          : $"Hello, {name}. This HTTP triggered function executed successfully.";

      return new OkObjectResult(responseMessage);
    }
  }
}
```

## Introduce Direct Injection

Add to the CSProject file `Custodian.csproj`

* Update the `Microsoft.NET.Sdk.Functions` to 3.0.7
* Add `Microsoft.Azure.Functions.Extensions` 1.0.0
* Add `Microsoft.Extensions.Http` 3.1.4

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netcoreapp3.1</TargetFramework>
    <AzureFunctionsVersion>v3</AzureFunctionsVersion>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Azure.Functions.Extensions" Version="1.0.0" />
    <PackageReference Include="Microsoft.Extensions.Http" Version="3.1.4" />
    <PackageReference Include="Microsoft.NET.Sdk.Functions" Version="3.0.7" />
  </ItemGroup>
  <ItemGroup>
    <None Update="host.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
    <None Update="local.settings.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <CopyToPublishDirectory>Never</CopyToPublishDirectory>
    </None>
  </ItemGroup>
</Project>
```

The function runtime is controlled by a file called `host.json`; and this will control simple yet, extremly important featuers such as logging. In its default form we are offered

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 5
      }
    },
    "fileLoggingMode": "debugOnly",
    "logLevel": {
      "default": "Trace"
    }
  }
}
```
 
This is accompanied with a file to define the environment variables `local.settings.json`

```json
{
    "IsEncrypted": false,
    "Values": {
        "AzureWebJobsStorage": "UseDevelopmentStorage=true",
        "FUNCTIONS_WORKER_RUNTIME": "dotnet"
    }
}
```

Add a `startup.cs`

```cs
using Microsoft.Azure.Functions.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;


[assembly: FunctionsStartup(typeof(AzureFunctionDependencyInjection.Startup))]
namespace AzureFunctionDependencyInjection
{
  public class Startup : FunctionsStartup
  {
    public override void Configure(IFunctionsHostBuilder builder)
    {
      builder.Services.AddHttpClient();
    }
  }
}
```


## HTTP Trigger Function
The initial template created for a HTTP Trigger function will include the function itself `function1.cs`

```cs
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Microsoft.Extensions.Configuration;

namespace Custodian
{

  public class Function1
  {
    private readonly ILogger<Function1> _Logger;
    private readonly IConfiguration _Configuration;

    public Function1(ILogger<Function1> logger, IConfiguration config)
    {
      _Logger = logger;
      _Configuration = config;
    }

    [FunctionName("Function1")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)] HttpRequest req)
    {
      _Logger.LogTrace("Trace - C# HTTP trigger function processed a request.");
      _Logger.LogDebug("Debug - C# HTTP trigger function processed a request.");
      _Logger.LogInformation("Information - C# HTTP trigger function processed a request.");
      _Logger.LogWarning("Warning - C# HTTP trigger function processed a request.");
      _Logger.LogError("Error - C# HTTP trigger function processed a request.");
      _Logger.LogCritical("Critical - C# HTTP trigger function processed a request.");

      string name = req.Query["name"];

      string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
      dynamic data = JsonConvert.DeserializeObject(requestBody);
      name = name ?? data?.name;

      string responseMessage = string.IsNullOrEmpty(name)
          ? "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response."
          : $"Hello, {name}. This HTTP triggered function executed successfully.";

      return new OkObjectResult(responseMessage);
    }
  }
}
```

---
<!-- enrich:containment -->
*Part of: damianflynn*

