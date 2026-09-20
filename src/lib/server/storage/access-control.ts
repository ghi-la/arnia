import type { SessionContext } from '../auth/session';
import type { Attachment } from '../db/schema';

/**
 * Attachments are polymorphic, so authorizing access to one means asking
 * "can this session see the entity it belongs to?" — mapped per
 * `entityType`. Extend this as new modules start attaching files. Fails
 * closed: an unrecognized `entityType` is denied.
 */
export function canAccessAttachment(session: SessionContext | null, a: Attachment): boolean {
	if (!session || !session.user.isActive) return false;

	switch (a.entityType) {
		case 'item':
			return session.permissions.has('inventory.view');
		default:
			return false;
	}
}
