#!/usr/bin/env python3
import sys
import json
import imaplib
import email
from email.header import decode_header
from datetime import datetime


def read_payload():
    raw = sys.stdin.read()
    if not raw:
        return {}
    return json.loads(raw)


def decode_value(value):
    if not value:
        return ''
    try:
        decoded_parts = decode_header(value)
    except Exception:
        return value

    result = ''
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            enc = encoding or 'utf-8'
            try:
                result += part.decode(enc, errors='ignore')
            except Exception:
                result += part.decode('utf-8', errors='ignore')
        else:
            result += part
    return result


def extract_snippet(message):
    for part in message.walk():
        content_type = part.get_content_type()
        disposition = part.get('Content-Disposition')
        if content_type == 'text/plain' and (not disposition or disposition == 'inline'):
            payload = part.get_payload(decode=True)
            if payload:
                charset = part.get_content_charset() or 'utf-8'
                try:
                    text = payload.decode(charset, errors='ignore')
                except Exception:
                    text = payload.decode('utf-8', errors='ignore')
                text = ' '.join(text.split())
                return text[:240]
    return ''


def parse_date(value):
    if not value:
        return None
    try:
        parsed = email.utils.parsedate_to_datetime(value)
        if isinstance(parsed, datetime):
            return parsed.isoformat()
    except Exception:
        return value
    return value


def connect_imap(config):
    host = config.get('imapHost')
    port = int(config.get('imapPort') or 993)
    username = config.get('user')
    password = config.get('pass')
    if not host or not username or not password:
        raise ValueError('IMAP configuration incomplete')

    use_ssl = config.get('useSecureImap', True)
    if use_ssl:
        client = imaplib.IMAP4_SSL(host, port)
    else:
        client = imaplib.IMAP4(host, port)

    if config.get('useStartTls') and not use_ssl:
        client.starttls()

    client.login(username, password)
    return client


def test_connection(config):
    client = connect_imap(config)
    try:
        client.noop()
    finally:
        client.logout()
    return {'imap': True}


def fetch_emails(config, folder_name, limit):
    client = connect_imap(config)
    try:
        client.select(folder_name or 'INBOX')
        status, data = client.search(None, 'ALL')
        if status != 'OK':
            raise RuntimeError('Failed to search mailbox')
        ids = data[0].split()
        if not ids:
            return []
        ids = ids[-limit:]
        messages = []
        for uid in ids:
            status, fetched = client.fetch(uid, '(RFC822 FLAGS)')
            if status != 'OK':
                continue
            for response_part in fetched:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    flags = []
                    if isinstance(response_part[0], bytes):
                        meta = response_part[0].decode('utf-8', errors='ignore')
                        if 'FLAGS' in meta:
                            start = meta.find('FLAGS (')
                            if start != -1:
                                end = meta.find(')', start)
                                if end != -1:
                                    flags = meta[start + 7:end].split()
                    messages.append({
                        'id': uid.decode('utf-8'),
                        'subject': decode_value(msg.get('Subject')),
                        'from': decode_value(msg.get('From')),
                        'to': decode_value(msg.get('To')),
                        'date': parse_date(msg.get('Date')),
                        'snippet': extract_snippet(msg),
                        'flags': flags,
                    })
        return messages[::-1]
    finally:
        client.logout()


def move_email(config, email_id, target_folder):
    if not email_id:
        raise ValueError('emailId is required')
    if not target_folder:
        raise ValueError('targetFolder is required')

    client = connect_imap(config)
    try:
        status, _ = client.uid('COPY', email_id, target_folder)
        if status != 'OK':
            raise RuntimeError('Failed to copy message')
        client.uid('STORE', email_id, '+FLAGS', '(\\Deleted)')
        client.expunge()
        return {'moved': True}
    finally:
        client.logout()


def main():
    try:
        payload = read_payload()
        action = payload.get('action')
        config = payload.get('config') or {}
        if action == 'test':
            result = test_connection(config)
        elif action == 'fetch':
            folder = payload.get('folderName') or 'INBOX'
            limit = int(payload.get('limit') or 20)
            result = {'messages': fetch_emails(config, folder, limit)}
        elif action == 'move':
            result = move_email(config, payload.get('emailId'), payload.get('targetFolder'))
        else:
            raise ValueError('Unsupported action')
        sys.stdout.write(json.dumps({'ok': True, **result}))
    except Exception as exc:
        sys.stdout.write(json.dumps({'ok': False, 'error': str(exc)}))
    finally:
        sys.stdout.flush()


if __name__ == '__main__':
    main()
