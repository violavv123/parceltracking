using System.Text.Json;

namespace ParcelTracking.Api;

public sealed class OrderStore
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public OrderStore(IWebHostEnvironment environment)
    {
        var directory = Path.Combine(environment.ContentRootPath, "data");
        Directory.CreateDirectory(directory);
        _filePath = Path.Combine(directory, "orders.json");
    }

    public async Task<ParcelOrder?> FindAsync(string number)
    {
        await _gate.WaitAsync();
        try { return (await ReadAsync()).FirstOrDefault(o => o.TrackingNumber.Equals(number, StringComparison.OrdinalIgnoreCase)); }
        finally { _gate.Release(); }
    }

    public async Task AddAsync(ParcelOrder order)
    {
        await _gate.WaitAsync();
        try { var orders = await ReadAsync(); orders.Insert(0, order); await WriteAsync(orders); }
        finally { _gate.Release(); }
    }

    public async Task<ParcelOrder?> UpdateStatusAsync(string number, string status, string note)
    {
        await _gate.WaitAsync();
        try
        {
            var orders = await ReadAsync();
            var order = orders.FirstOrDefault(o => o.TrackingNumber.Equals(number, StringComparison.OrdinalIgnoreCase));
            if (order is null) return null;
            order.Status = status;
            order.Updates.Add(new StatusUpdate(status, string.IsNullOrWhiteSpace(note) ? "Statusi u përditësua." : note, DateTime.UtcNow));
            await WriteAsync(orders);
            return order;
        }
        finally { _gate.Release(); }
    }

    private async Task<List<ParcelOrder>> ReadAsync()
    {
        if (!File.Exists(_filePath)) return [];
        await using var stream = File.OpenRead(_filePath);
        return await JsonSerializer.DeserializeAsync<List<ParcelOrder>>(stream, JsonOptions) ?? [];
    }

    private async Task WriteAsync(List<ParcelOrder> orders)
    {
        await using var stream = File.Create(_filePath);
        await JsonSerializer.SerializeAsync(stream, orders, JsonOptions);
    }
}
