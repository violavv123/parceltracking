using ParcelTracking.Api;
using System.Security.Cryptography;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<OrderStore>();
builder.Services.AddSingleton<AdminSessions>();
builder.Services.AddHttpClient<GeocodingService>(client =>
{
    client.DefaultRequestHeaders.UserAgent.ParseAdd("ParcelTrackingStudentDemo/1.0");
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddCors(options => options.AddPolicy("ReactFrontend", policy =>
    policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors("ReactFrontend");

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/api/admin/login", (AdminLoginRequest request, IConfiguration config, AdminSessions sessions) =>
{
    var expected = config["Admin:Password"] ?? "";
    var submitted = request.Password ?? "";
    var valid = expected.Length > 0 && submitted.Length == expected.Length &&
                CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(submitted), Encoding.UTF8.GetBytes(expected));
    if (!valid) return Results.Unauthorized();
    return Results.Ok(new { token = sessions.Create() });
});

app.MapPost("/api/orders", async (CreateOrderRequest request, OrderStore store, GeocodingService geocoder) =>
{
    if (string.IsNullOrWhiteSpace(request.CustomerName) || string.IsNullOrWhiteSpace(request.CustomerEmail) ||
        string.IsNullOrWhiteSpace(request.ProductDescription) || string.IsNullOrWhiteSpace(request.OriginAddress) ||
        string.IsNullOrWhiteSpace(request.DestinationAddress))
        return Results.BadRequest(new { message = "Plotëso të gjitha fushat e kërkuara." });

    var origin = await geocoder.GeocodeAsync(request.OriginAddress);
    if (origin is null) return Results.BadRequest(new { message = "Nuk u gjet adresa e nisjes. Provo të shtosh qytetin dhe shtetin." });
    var destination = await geocoder.GeocodeAsync(request.DestinationAddress);
    if (destination is null) return Results.BadRequest(new { message = "Nuk u gjet adresa e destinacionit. Provo të shtosh qytetin dhe shtetin." });

    var now = DateTime.UtcNow;
    var order = new ParcelOrder
    {
        TrackingNumber = $"PT-{Guid.NewGuid():N}"[..13].ToUpperInvariant(),
        CustomerName = request.CustomerName.Trim(),
        CustomerEmail = request.CustomerEmail.Trim(),
        ProductDescription = request.ProductDescription.Trim(),
        OriginAddress = request.OriginAddress.Trim(),
        DestinationAddress = request.DestinationAddress.Trim(),
        OriginLatitude = origin.Latitude,
        OriginLongitude = origin.Longitude,
        DestinationLatitude = destination.Latitude,
        DestinationLongitude = destination.Longitude,
        Status = "Processing",
        CreatedAtUtc = now,
        Updates = [new StatusUpdate("Processing", "Porosia u regjistrua.", now)]
    };
    await store.AddAsync(order);
    return Results.Created($"/api/orders/track/{order.TrackingNumber}", order);
});

app.MapGet("/api/orders/track/{trackingNumber}", async (string trackingNumber, OrderStore store) =>
{
    var order = await store.FindAsync(trackingNumber);
    return order is null ? Results.NotFound(new { message = "Nuk u gjet porosi me këtë numër." }) : Results.Ok(order);
});

app.MapGet("/api/admin/orders/{trackingNumber}", async (string trackingNumber, HttpRequest request, AdminSessions sessions, OrderStore store) =>
{
    if (!IsAdmin(request, sessions)) return Results.Unauthorized();
    var order = await store.FindAsync(trackingNumber);
    return order is null ? Results.NotFound(new { message = "Nuk u gjet porosi me këtë numër." }) : Results.Ok(order);
});

app.MapPut("/api/admin/orders/{trackingNumber}/status", async (
    string trackingNumber, UpdateStatusRequest request, HttpRequest httpRequest,
    AdminSessions sessions, OrderStore store) =>
{
    if (!IsAdmin(httpRequest, sessions)) return Results.Unauthorized();
    var allowed = new[] { "Processing", "Dispatched", "InTransit", "Arrived", "Delivered", "Cancelled" };
    if (!allowed.Contains(request.Status, StringComparer.OrdinalIgnoreCase))
        return Results.BadRequest(new { message = "Statusi i zgjedhur nuk lejohet." });
    var status = allowed.First(s => s.Equals(request.Status, StringComparison.OrdinalIgnoreCase));
    var updated = await store.UpdateStatusAsync(trackingNumber, status, request.Note?.Trim() ?? "");
    return updated is null ? Results.NotFound(new { message = "Nuk u gjet porosi me këtë numër." }) : Results.Ok(updated);
});

app.Run();

static bool IsAdmin(HttpRequest request, AdminSessions sessions) =>
    request.Headers.TryGetValue("X-Admin-Token", out var token) && sessions.IsValid(token.ToString());
