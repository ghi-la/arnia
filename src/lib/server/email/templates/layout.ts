/**
 * Minimal, self-contained HTML email layout — no external CSS/fonts/images,
 * since emails can't load anything but what's inlined (and Arnia doesn't
 * depend on external assets anywhere, see spec §0).
 */
export function renderEmailLayout(options: {
	title: string;
	bodyHtml: string;
	ctaLabel?: string;
	ctaUrl?: string;
	footerNote: string;
	orgName: string;
}): string {
	const { title, bodyHtml, ctaLabel, ctaUrl, footerNote, orgName } = options;

	const button =
		ctaLabel && ctaUrl
			? `<tr><td style="padding:24px 0 8px">
					<a href="${ctaUrl}" style="display:inline-block;background:#0b6b62;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">${ctaLabel}</a>
				</td></tr>
				<tr><td style="padding:0 0 24px;font-size:13px;color:#6b7280;word-break:break-all;">
					${footerNote}<br />${ctaUrl}
				</td></tr>`
			: '';

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${title}</title>
	</head>
	<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
			<tr>
				<td align="center">
					<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:12px;padding:32px;">
						<tr>
							<td style="font-size:15px;color:#3f3f46;line-height:1.6;">
								<div style="font-weight:700;font-size:18px;color:#0b6b62;margin-bottom:16px;">${orgName}</div>
								${bodyHtml}
							</td>
						</tr>
						${button}
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>`;
}

export function htmlToText(html: string): string {
	return html
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}
