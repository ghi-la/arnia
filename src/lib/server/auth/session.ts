export interface SessionContext {
	user: {
		id: string;
		email: string;
		name: string;
		locale: string;
		isActive: boolean;
	};
	permissions: Set<string>;
	roles: string[];
}
