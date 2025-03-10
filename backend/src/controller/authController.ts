import { Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { Database } from '../config/db';
import { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID as string;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET as string;
const REDIRECT_URI =
	process.env.ENVIRONMENT === 'DEVELOPMENT'
		? `${process.env.DEV_SERVER_URL}/api/auth/callback`
		: `${process.env.SERVER_URL}/api/auth/callback`;

/**
 * Redirects the user to the Discord authentication page.
 * @param req - The request object containing the incoming HTTP request.
 * @param res - The response object used to send a response to the client.
 */
export const login = (req: Request, res: Response): void => {
	const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
	res.redirect(discordAuthUrl);
};

/**
 * Handles the callback from Discord after user authentication.
 * @param req - The request object containing the incoming HTTP request.
 * @param res - The response object used to send a response to the client.
 * @returns {Promise<void>}
 */
export const loginCallback = async (
	req: Request,
	res: Response
): Promise<void> => {
	const { code, error, error_description } = req.query;

	if (error === 'access_denied') {
		res.status(403).send(`Access denied: ${error_description}`);
		return;
	}

	if (!code) {
		res.status(400).send('Error: No code received.');
		return;
	}

	try {
		const tokenResponse = await axios.post(
			'https://discord.com/api/oauth2/token',
			new URLSearchParams({
				client_id: DISCORD_CLIENT_ID,
				client_secret: DISCORD_CLIENT_SECRET,
				code: code as string,
				grant_type: 'authorization_code',
				redirect_uri: REDIRECT_URI,
				scope: 'identify',
			}),
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			}
		);

		const { access_token } = tokenResponse.data;

		const userInfoResponse = await axios.get(
			'https://discord.com/api/users/@me',
			{
				headers: { Authorization: `Bearer ${access_token}` },
			}
		);

		const { username, avatar, id } = userInfoResponse.data;

		const db = Database.getInstance();

		const existingUser = await db.query('users', { id });

		const newUser: User = {
			id,
			username,
			avatar,
			createdAt: new Date().toISOString(),
			twoFactorEnabled: false,
			twoFactorSecret: '',
			masterPassword: '',
			passwords: [],
		};

		if (existingUser && existingUser.length > 0) {
			const updatedUserData: any = {
				username,
				avatar,
				createdAt:
					existingUser[0].createdAt || new Date().toISOString(),
				twoFactorEnabled: existingUser[0].twoFactorEnabled || false,
				twoFactorSecret: existingUser[0].twoFactorSecret || '',
				masterPassword: existingUser[0].masterPassword || '',
			};

			await db.update('users', updatedUserData, { id });
		} else {
			await db.insert('users', newUser);
		}

		const token = jwt.sign({ username, avatar, id }, JWT_SECRET);

		const clientRedirectUrl =
			process.env.ENVIRONMENT === 'DEVELOPMENT'
				? `${process.env.DEV_CLIENT_URL}/auth/callback?token=${token}`
				: `${process.env.CLIENT_URL}/auth/callback?token=${token}`;

		res.redirect(clientRedirectUrl);
	} catch (error: unknown) {
		if (axios.isAxiosError(error)) {
			console.error(
				'Error during authentication (Axios):',
				error.response?.data
			);
			res.status(500).json({
				message:
					error.response?.data ||
					'Error during authentication (Axios)',
			});
		} else if (error instanceof Error) {
			console.error('Error during authentication:', error.message);
			res.status(500).json({
				message: error.message || 'Error during authentication',
			});
		} else {
			console.error(
				'Unexpected error during authentication:',
				String(error)
			);
			res.status(500).json({
				message: 'Unexpected error during authentication',
			});
		}
	}
};
