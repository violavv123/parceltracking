using System.Collections.Concurrent;

namespace ParcelTracking.Api;


public sealed class AdminSessions
{
    private readonly ConcurrentDictionary<string, DateTime> _sessions = new();
    public string Create()
    {
        var token = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
        _sessions[token] = DateTime.UtcNow.AddHours(8);
        return token;
    }
    public bool IsValid(string token)
    {
        if (!_sessions.TryGetValue(token, out var expires)) return false;
        if (expires > DateTime.UtcNow) return true;
        _sessions.TryRemove(token, out _);
        return false;
    }
}
