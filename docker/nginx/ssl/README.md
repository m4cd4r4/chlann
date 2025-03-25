# SSL Certificates

This directory should contain your SSL certificates for HTTPS.

## For Production

In a production environment, you should use proper SSL certificates from a trusted Certificate Authority (CA) like Let's Encrypt, Comodo, DigiCert, etc.

Place your certificates here with the following names:
- `server.crt` - The SSL certificate
- `server.key` - The private key

## For Development/Testing

For development or testing purposes, you can generate self-signed certificates using OpenSSL.

### Generating Self-Signed Certificates

1. Install OpenSSL if you don't have it already.

2. Generate a private key:
```bash
openssl genrsa -out server.key 2048
```

3. Generate a Certificate Signing Request (CSR):
```bash
openssl req -new -key server.key -out server.csr
```

4. Generate a self-signed certificate (valid for 365 days):
```bash
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
```

5. Place the `server.crt` and `server.key` files in this directory.

### One-Line Command

Alternatively, you can use this one-line command to generate both the key and certificate:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt
```

## Security Note

- Never commit your private keys to version control
- Keep your private keys secure
- In production, use proper certificate management practices
