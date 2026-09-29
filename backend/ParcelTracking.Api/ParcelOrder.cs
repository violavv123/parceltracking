namespace ParcelTracking.Api;

public sealed class ParcelOrder
{
    public required string TrackingNumber { get; init; }
    public required string CustomerName { get; init; }
    public required string CustomerEmail { get; init; }
    public required string ProductDescription { get; init; }
    public required string OriginAddress { get; init; }
    public required string DestinationAddress { get; init; }
    public double OriginLatitude { get; init; }
    public double OriginLongitude { get; init; }
    public double DestinationLatitude { get; init; }
    public double DestinationLongitude { get; init; }
    public required string Status { get; set; }
    public DateTime CreatedAtUtc { get; init; }
    public List<StatusUpdate> Updates { get; init; } = [];
}

public sealed record StatusUpdate(string Status, string Note, DateTime UpdatedAtUtc);
public sealed record CreateOrderRequest(string CustomerName, string CustomerEmail, string ProductDescription, string OriginAddress, string DestinationAddress);
public sealed record UpdateStatusRequest(string Status, string? Note);
public sealed record AdminLoginRequest(string? Password);
