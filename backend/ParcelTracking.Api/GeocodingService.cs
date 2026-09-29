using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;

namespace ParcelTracking.Api;

public sealed record GeoPoint(double Latitude, double Longitude);

public sealed class GeocodingService(HttpClient http)
{
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private static readonly ConcurrentDictionary<string, GeoPoint> Cache = new(StringComparer.OrdinalIgnoreCase);
    private static DateTime _lastRequestUtc = DateTime.MinValue;

    public async Task<GeoPoint?> GeocodeAsync(string address)
    {
        var key = address.Trim();
        if (Cache.TryGetValue(key, out var cached)) return cached;
        await Gate.WaitAsync();
        try
        {
            if (Cache.TryGetValue(key, out cached)) return cached;
            var wait = TimeSpan.FromSeconds(1.1) - (DateTime.UtcNow - _lastRequestUtc);
            if (wait > TimeSpan.Zero) await Task.Delay(wait);
            var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + Uri.EscapeDataString(key);
            using var response = await http.GetAsync(url);
            response.EnsureSuccessStatusCode();
            _lastRequestUtc = DateTime.UtcNow;
            await using var stream = await response.Content.ReadAsStreamAsync();
            using var json = await JsonDocument.ParseAsync(stream);
            if (json.RootElement.GetArrayLength() == 0) return null;
            var item = json.RootElement[0];
            var point = new GeoPoint(
                double.Parse(item.GetProperty("lat").GetString()!, CultureInfo.InvariantCulture),
                double.Parse(item.GetProperty("lon").GetString()!, CultureInfo.InvariantCulture));
            Cache[key] = point;
            return point;
        }
        finally { Gate.Release(); }
    }
}
