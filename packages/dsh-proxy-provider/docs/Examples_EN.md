# Examples in DSH

1. In model settings, open the model provider proxy section.
2. Create a profile with a name, protocol, host, and port. Add credentials if the proxy requires them.
3. Run a connection test and check the result and latency.
4. Select the profile for a provider. If two providers share a host, check which profile the conflict notice lists.

To move settings to a different DSH profile, export the configuration and import the file into the destination profile. Credentials are included only when requested and are encrypted with the password set during export.
