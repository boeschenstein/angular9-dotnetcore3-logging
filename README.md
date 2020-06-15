# Add Logging to .NET Core 3.1 WebApi

## Content

- [Add Logging to .NET Core 3.1 WebApi](#add-logging-to-net-core-31-webapi)
  - [Content](#content)
  - [Goal](#goal)
  - [What you should bring](#what-you-should-bring)
  - [About Logging](#about-logging)
  - [Use Logging in ASP.NET Core projects](#use-logging-in-aspnet-core-projects)
    - [Get a .NET WebAPI project](#get-a-net-webapi-project)
    - [.NET Core is prepared for logging](#net-core-is-prepared-for-logging)
  - [Example 1: Serilog: Basic Implementation without settings in appsettings.json](#example-1-serilog-basic-implementation-without-settings-in-appsettingsjson)
    - [Install Serilog](#install-serilog)
    - [Config and implement Serilog](#config-and-implement-serilog)
    - [Activate Serilog](#activate-serilog)
    - [Load Configuration from appsettings.config](#load-configuration-from-appsettingsconfig)
    - [Serilog config in appsettings.json](#serilog-config-in-appsettingsjson)
    - [Pros/Cons of this approach](#proscons-of-this-approach)
  - [Example 3: Early Initialization and config in appsettings.json](#example-3-early-initialization-and-config-in-appsettingsjson)
    - [Install Serilog](#install-serilog-1)
    - [Early initialization and Load Configuration from appsettings.config](#early-initialization-and-load-configuration-from-appsettingsconfig)
    - [Pros/Cons of this approach](#proscons-of-this-approach-1)
  - [Request Logging](#request-logging)
  - [What's next](#whats-next)
  - [Additional Information](#additional-information)
    - [Links](#links)
    - [Current Versions](#current-versions)

## Goal

Activate and use logging of .NET Core. Implement and configure 3rd party logging (Serilog). 

>Although .NET Core knows about logging (ILogger), it has no built-in file logger.

Before you start, you should get some basic understanding of the configuration mechanics in ASP.NET Core: <https://github.com/boeschenstein/aspnetcore3_configuration>

## What you should bring

Some basic understanding of

- Windows
- .NET Core and C#
- npm, node
- Web technology

## About Logging

- You have to be familiar with "Development" environment settings (appsettings.json vs. appsettings.Development.json)
- If you have additional appsettings.json/appsettings.Development.json in subsequent assemblies, they will overwrite the main/entry settings
- If you call others than dll (WebApi), new setup and settings (NLog,SeriLog, ILogger) are needed
- Im theory, you can mix both: _logger.LogInformation (ILogger) or native functions (_nlog.Info or serilog). But then you should to keep the minimum severity level (appsettings.json vs. nlog.config or serilog config) in sync

## Use Logging in ASP.NET Core projects

### Get a .NET WebAPI project

Use your own .NET Core 3.1 WebApi backend.

Alternatively you can clone my sample from here: <https://github.com/boeschenstein/angular9-dotnetcore3>

> If you are new to web development: download the code, open cmd in the folder `\frontend` and enter "npm i" to install the node modules.

### .NET Core is prepared for logging

Unlike the old .NET versions, .NET Core is prepared for logging. It comes with some interfaces like ILogger\<T>. Here an example from `\WebApplication1\WebApplication1\Controllers\WeatherForecastController.cs`, where the logger gets [injected](https://github.com/boeschenstein/definition#dependency-injection) in the constructor:

``` c#
public WeatherForecastController(ILogger<WeatherForecastController> logger)
{
    _logger = logger;
}
```

Write some Log in your application...

``` c#
[HttpGet]
public IEnumerable<WeatherForecast> Get()
{
    _logger.LogTrace("Get() was called! (trace)");
    _logger.LogDebug("Get() was called! (debug)");
    _logger.LogInformation("Get() was called! (information)");
    _logger.LogWarning("Get() was called! (warning)");
    _logger.LogError("Get() was called! (error)");
    _logger.LogCritical("Get() was called! (critical)");
    ...
}
```

... run your application, read data from backend (open <https://localhost:5001/weatherforecast> to call the Get() function of the controller) and check the Output window in Visual Studio (Menu: Debug: Windows: Output):

``` cmd
...
MyBackend.Controllers.WeatherForecastController: Information: Get() was called! (information)
MyBackend.Controllers.WeatherForecastController: Warning: Get() was called! (warning)
...
MyBackend.Controllers.WeatherForecastController: Error: Get() was called! (error)
MyBackend.Controllers.WeatherForecastController: Critical: Get() was called! (critical)
...
```

## Example 1: Serilog: Basic Implementation without settings in appsettings.json

### Install Serilog

Open cmd in the folder with the project file (.csproj) file.

``` cmd
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.File
```

### Config and implement Serilog

Add a basic Logger (Serilog) configuration:

``` c#
using Serilog;

public static int Main(string[] args)
{
    Log.Logger = new LoggerConfiguration()
        .MinimumLevel.Debug()
        .WriteTo.Console()
        .WriteTo.File("logs\\log.txt", rollingInterval: RollingInterval.Day) // default log file name pattern: \logs\log{yyymmdd}.txt
        .Enrich.FromLogContext()
        .CreateLogger();

    CreateHostBuilder(args).Build().Run();
}
```

<details>
  <summary>To log any startup errors, add a try-catch in `Main.cs`:</summary>

``` c#
using Serilog;
using Serilog.Events;

public static int Main(string[] args)
{
    Log.Logger = new LoggerConfiguration()
        .MinimumLevel.Debug()
        .WriteTo.Console()
        .WriteTo.File("logs\\log.txt", rollingInterval: RollingInterval.Day) // default log file name pattern: \logs\log{yyymmdd}.txt
        .Enrich.FromLogContext()
        .CreateLogger();
    try
    {
        Log.Information("Starting web host");
        CreateHostBuilder(args).Build().Run(); // Serilog: this line was already there. The other lines have been added
        return 0;
    }
    catch (Exception ex)
    {
        Log.Fatal(ex, "Host terminated unexpectedly");
        return 1;
    }
    finally
    {
        Log.CloseAndFlush();
    }
}
```

</details>

### Activate Serilog

Add the last line in CreateHostBuilder() in `Main.cs`:

``` c#
public static IHostBuilder CreateHostBuilder(string[] args) =>
    Host.
    ...
    .UseSerilog(); // <-- Serilog: add this line
```

When you start the application, you see the log file in this folder: `\<your_webapi_project>\logs\log20200420.txt`

### Pros/Cons of this approach

- Pro: Early initialization: Application startup log is included.
- Con: The logger is not configured in appsettings.json.

## Example 2: Serilog: Basic Implementation with appsettings.json

<https://github.com/serilog/serilog-aspnetcore/tree/dev/samples/InlineInitializationSample>

### Install Serilog

Open cmd in the folder with the project file (.csproj) file and add the following libraries:

``` cmd
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.File
```

### Load Configuration from appsettings.config

In `program.cs`, add this to the CreateDefaultBuilder call:

``` c#
    .UseSerilog((hostingContext, loggerConfiguration) => loggerConfiguration
        .ReadFrom.Configuration(hostingContext.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Debug()
        .WriteTo.Console()
      //.WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}") // enhanced logging example
        ;
```

<details>
  <summary>Here you can find the complete code of `program.cs`:</summary>

```c#
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Serilog;

namespace MyBackend
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                })
              .UseSerilog((hostingContext, loggerConfiguration) => loggerConfiguration
                .ReadFrom.Configuration(hostingContext.Configuration)
                .Enrich.FromLogContext()
                .WriteTo.Debug()
                .WriteTo.Console()
              //.WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}") // enhanced logging example
            );
    }
}
```

</details>

### Serilog config in appsettings.json

Serilog does not need this "Logging" section, you can delete this:

``` json
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning",
      "Microsoft.Hosting.Lifetime": "Information"
    }
  },
```

This is the complete appsettings.json for Serilog with rolling file:

``` json
{
  "Serilog": {
    "WriteTo": [
      {
        "Name": "File",
        "Args": {
          "path": "logs\\myApplication.log",
          "rollingInterval": "Day"
        }
      }
    ]
  },
  "AllowedHosts": "*"
}
```

Run the application and you will see the log file here `\<your_webapi_project>\logs\myApplication20200420.txt`

### Pros/Cons of this approach

- Con: no Early initialization: Application startup log is not included.
- Pro: The logger is configured in appsettings.json.

## Example 3: Early Initialization and config in appsettings.json

### Install Serilog

Open cmd in the folder with the project file (.csproj) file and add the following libraries:

``` cmd
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.File
```

### Early initialization and Load Configuration from appsettings.config

``` c#
public class Program
{
    // source: https://github.com/serilog/serilog-aspnetcore/blob/dev/samples/EarlyInitializationSample/Program.cs

    public static IConfiguration Configuration { get; } = new ConfigurationBuilder()
        .SetBasePath(Directory.GetCurrentDirectory())
        .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
        .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
        .AddEnvironmentVariables()
        .Build();

        public static int Main(string[] args)
        {
            Log.Logger = new LoggerConfiguration()
                .ReadFrom.Configuration(Configuration)
                .Enrich.FromLogContext()
                .WriteTo.Debug()
                .WriteTo.Console()
                // .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}") // enhanced logging example
                .CreateLogger();

           CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                ...
                .UseSerilog() // <-- add this line
                ;
}
```

[Here](https://github.com/serilog/serilog-aspnetcore/blob/dev/samples/EarlyInitializationSample/Program.cs) is the complete source. It adds try-cast around the run() function;

### Serilog config in appsettings.json

Serilog does not need this "Logging" section, this is the complete appsettings.json for Serilog with rolling file:

``` json
{
  "Serilog": {
    "WriteTo": [
      {
        "Name": "File",
        "Args": {
          "path": "logs\\myApplication.log",
          "rollingInterval": "Day"
        }
      }
    ]
  },
  "AllowedHosts": "*"
}
```

Run the application and you will see the log file here `\<your_webapi_project>\logs\myApplication20200420.txt`

### Pros/Cons of this approach

- Con: not very obvious/consistent.
- Con: manually rebuild initialization order and logic of CreateDefaultBuilder
- Pro: The logger is configured in appsettings.json.
- Pro: Early initialization: Application startup log is included.

## Request Logging

To add request logging, call UseSerilogRequestLogging():

``` c#
public void Configure(IApplicationBuilder app, IHostingEnvironment env)
{
    if (env.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
    }

    app.UseSerilogRequestLogging(); // <-- Add this line

    // ... add other app configuration below this ...
```

## Serilog Packages

| Package                                 | Function                          | Status                              | GitHub                                                      |
| --------------------------------------- | --------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| Serilog.AspNetCore                      | Core functionality                |                                     |                                                             |
| Serilog.Enrichers.Environment           |                                   |                                     |                                                             |
| Serilog.Settings.Configuration          | reads appsettings.json            |                                     | <https://github.com/serilog/serilog-settings-configuration> |
| Serilog.Sinks.Async                     |                                   |                                     |                                                             |
| Serilog.Sinks.Console                   |                                   |                                     |                                                             |
| Serilog.Sinks.RollingFile               | Rolling file logging              | Deprecated: use  Serilog.Sinks.File | <https://github.com/serilog/serilog-sinks-rollingfile>      |
| Serilog.Sinks.File                      | normal file logging (not rolling) |                                     | <https://github.com/serilog/serilog-sinks-file>             |
| Serilog.Sinks.Seq                       |                                   |                                     |                                                             |
| Microsoft.Extensions.Configuration      |                                   |                                     |                                                             |
| Microsoft.Extensions.Configuration.Json |                                   |                                     |                                                             |

## NLog

Source: `https://github.com/NLog/NLog/wiki/Getting-started-with-.NET-Core-2---Console-application`

Add `nlog.config` file to the entry project:

```xml
<?xml version="1.0" encoding="utf-8" ?>
<!-- XSD manual extracted from package NLog.Schema: https://www.nuget.org/packages/NLog.Schema-->
<nlog xmlns="http://www.nlog-project.org/schemas/NLog.xsd" xsi:schemaLocation="NLog NLog.xsd"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      autoReload="true"
      internalLogFile="c:\temp\console-example-internal.log"
      internalLogLevel="Info" >
  <targets>
    <target xsi:type="File" name="target1" fileName="console-example-${shortdate}.log"
            layout="${longdate}|${event-properties:item=EventId_Id}|${level:uppercase=true}|${message} ${exception}|${logger}|${all-event-properties}" />
    <target xsi:type="Console" name="target2"
            layout="${date}|${level:uppercase=true}|${message} ${exception}|${logger}|${all-event-properties}" />
  </targets>
  <rules>
    <logger name="*" minlevel="Trace" writeTo="target1,target2" />
  </rules>
</nlog>
```

Use the logger:

```c#
// Constructor Dependency Injection
public Tester(ILogger<Tester> logger)
{
    // .NET Core ILogger<T>
    logger.LogInformation("Hello from Tester - .NET Core ILogger<T>");

    // Native NLog logger (no DI needed - nice for simpler unit testing)
    Logger log = LogManager.GetCurrentClassLogger();
    log.Info("Hello from Tester - NLog native");
}
```

### Implement NLog in Console

Add NLog

```cmd
install-package NLog
```

Load nlog config file:

```c#
serviceCollection.AddLogging(builder =>
{
    builder.SetMinimumLevel(LogLevel.Information); // this is the Default if you set "Default" in appsettings.json
    builder.AddNLog("nlog.config");
});
```

### Implement NLog in ASP.NET Core 3

Add NLog

```cmd
install-package NLog.Web.AspNetCore
install-package NLog
```

Use this program class

```c#
public class Program
{
    public static void Main(string[] args)
    {
        var logger = NLog.Web.NLogBuilder.ConfigureNLog("nlog.config").GetCurrentClassLogger();

        try
        {
            logger.Debug("init main");
            CreateHostBuilder(args).Build().Run();
        }
        catch (Exception ex)
        {
            //NLog: catch setup errors
            logger.Error(ex, "Stopped program because of exception");
            throw;
        }
        finally
        {
            // Ensure to flush and stop internal timers/threads before application-exit (Avoid segmentation fault on Linux)
            NLog.LogManager.Shutdown();
        }
    }

    public static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                })
            .ConfigureLogging(logging =>
                {
                    logging.ClearProviders();
                    logging.SetMinimumLevel(Microsoft.Extensions.Logging.LogLevel.Trace); // this is the Default if you set "Default" in appsettings.json
                })
            .UseNLog();  // NLog: Setup NLog for Dependency injection;
}
```

## What's next

Swagger/OpenApi are tools which can create your Angular code to access the backend: check this <https://github.com/boeschenstein/angular9-dotnetcore-openapi-swagger>

## Additional Information

### Links

- .NET Core configuration: <https://github.com/boeschenstein/aspnetcore3_configuration>
- .NET Core logging: <https://docs.microsoft.com/en-us/aspnet/core/fundamentals/logging/?view=aspnetcore-3.1>
- Third-party logging providers: <https://docs.microsoft.com/en-us/aspnet/core/fundamentals/logging/?view=aspnetcore-3.1#third-party-logging-providers>
- Serilog
  - <https://github.com/serilog/serilog-aspnetcore>
  - Setting up Serilog in ASP.NET Core 3: <https://nblumhardt.com/2019/10/serilog-in-aspnetcore-3/>
- NLog
  - .NET Core Console: https://github.com/NLog/NLog/wiki/Getting-started-with-.NET-Core-2---Console-application
  - ASP.NET Core 3: <https://github.com/NLog/NLog/wiki/Getting-started-with-ASP.NET-Core-3>
- Log levels: <https://docs.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.loglevel>
- Generic Host builder (Core 3) replaces Web Host Builder (Core 2): <https://docs.microsoft.com/en-us/aspnet/core/fundamentals/host/web-host?view=aspnetcore-3.1>
- ASP.NET WebApi: <https://docs.microsoft.com/en-us/aspnet/core/tutorials/first-web-api?view=aspnetcore-3.1&tabs=visual-studio>
- About me: <https://github.com/boeschenstein>

### Current Versions

- Visual Studio 2019 16.5.4
- .NET core 3.1
- npm 6.14.4
- node 12.16.1
- Angular CLI 9.1
- Serilog.AspNetCore 3.2.0
- Serilog.Sinks.File 4.1.0
