import tls from 'node:tls';

export async function auditTls(url, timeoutMs = 6000) {
  if (url.protocol !== 'https:') return { items: [], details: null };
  const port = Number(url.port || 443);
  const hostname = url.hostname;

  try {
    const details = await inspectTls(hostname, port, timeoutMs);
    const daysRemaining = details.validTo ? Math.floor((new Date(details.validTo).getTime() - Date.now()) / 86_400_000) : null;
    return {
      details: { ...details, daysRemaining },
      items: [
        sec('tls-authorized', 'Validação TLS', details.authorized ? 'pass' : 'fail', details.authorized ? 'Certificado aceito pela validação TLS do Node.js.' : `Certificado não autorizado: ${details.authorizationError || 'motivo desconhecido'}.`, details.authorized ? undefined : 'Corrija a cadeia, hostname ou validade do certificado.', 3, !details.authorized),
        sec('tls-version', 'Versão TLS', ['TLSv1.3', 'TLSv1.2'].includes(details.protocol) ? 'pass' : 'warning', `Protocolo negociado: ${details.protocol || 'desconhecido'}.`, ['TLSv1.3', 'TLSv1.2'].includes(details.protocol) ? undefined : 'Prefira TLS 1.2 ou 1.3.', 2),
        sec('certificate-expiry', 'Validade do certificado', daysRemaining == null ? 'info' : daysRemaining >= 30 ? 'pass' : daysRemaining >= 7 ? 'warning' : 'fail', daysRemaining == null ? 'Não foi possível determinar a expiração.' : `Certificado expira em aproximadamente ${daysRemaining} dia(s) (${details.validTo}).`, daysRemaining != null && daysRemaining < 30 ? 'Renove o certificado antes da expiração.' : undefined, 3)
      ]
    };
  } catch (error) {
    return {
      details: { error: error instanceof Error ? error.message : String(error) },
      items: [sec('tls-check', 'Inspeção TLS', 'warning', `Não foi possível concluir a inspeção TLS: ${error instanceof Error ? error.message : String(error)}`, 'Confirme conectividade e configuração do certificado.', 2)]
    };
  }
}

function inspectTls(hostname, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: hostname, port, servername: hostname, rejectUnauthorized: false });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('Timeout na conexão TLS.'));
    }, timeoutMs);

    socket.once('secureConnect', () => {
      clearTimeout(timer);
      const cert = socket.getPeerCertificate();
      const result = {
        authorized: socket.authorized,
        authorizationError: socket.authorizationError,
        protocol: socket.getProtocol(),
        cipher: socket.getCipher()?.name,
        subject: cert.subject?.CN,
        issuer: cert.issuer?.CN,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        fingerprint256: cert.fingerprint256
      };
      socket.end();
      resolve(result);
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function sec(id, title, severity, message, recommendation, weight = 1, critical = false) {
  return { category: 'Segurança', id, title, severity, message, recommendation, weight, critical };
}
