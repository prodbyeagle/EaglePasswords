import { useState, useEffect } from 'react';
import {
	fetchPasswords,
	addPassword,
	updatePassword,
	deletePassword,
	getAuthToken,
} from '@/lib/api';
import type { Password } from '@/types';
import { getPasswordStrength } from '@/components/Password/PasswordCard';
import { toast } from 'sonner';

export const useHomePageLogic = () => {
	const [passwords, setPasswords] = useState<Password[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] =
		useState<boolean>(false);
	const [selectedPassword, setSelectedPassword] = useState<Password | null>(
		null
	);
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
	const [showPassword, setShowPassword] = useState<{
		[key: string]: boolean;
	}>({});
	const [showUsername, setshowUsername] = useState<{
		[key: string]: boolean;
	}>({});
	const [searchTerm, setSearchTerm] = useState<string>('');
	const [sortOptions, setSortOptions] = useState<{
		field: 'title' | 'username' | 'createdAt' | 'updatedAt' | 'strength';
		order: 'asc' | 'desc';
	}>({
		field: 'createdAt',
		order: 'desc',
	});
	const [newPassword, setNewPassword] = useState<{
		title: string;
		username: string;
		password: string;
		url?: string;
		note?: string;
	}>({
		title: '',
		username: '',
		password: '',
		url: '',
		note: '',
	});

	useEffect(() => {
		const getPasswords = async () => {
			setLoading(true);
			setError(null);

			try {
				const token = getAuthToken();
				if (!token) {
					throw new Error(
						'Authentication token not found. Please log in.'
					);
				}
				const fetchedPasswords = await fetchPasswords();
				setPasswords(fetchedPasswords);
				setIsLoggedIn(true);
			} catch (error: unknown) {
				if (error instanceof Error) {
					setError(error.message);
				} else {
					setError(
						'An unknown error occurred while loading passwords.'
					);
				}
			} finally {
				setLoading(false);
			}
		};

		getPasswords();
	}, []);

	const handleAddOrUpdatePassword = async () => {
		const passwordData = {
			title: newPassword.title,
			username: newPassword.username,
			password: newPassword.password,
			url: newPassword.url,
			note: newPassword.note,
			updatedAt: new Date().toISOString(),
		};

		if (selectedPassword) {
			await updatePassword(selectedPassword.id, passwordData);
			setPasswords(
				passwords.map((p) =>
					p.id === selectedPassword.id ? { ...p, ...passwordData } : p
				)
			);
		} else {
			const id = await addPassword({
				...passwordData,
				createdAt: new Date().toISOString(),
			});
			if (id) {
				setPasswords([
					...passwords,
					{
						...passwordData,
						id,
						createdAt: new Date().toISOString(),
					},
				]);
			}
		}

		handleCloseDialog();
	};

	const handleEdit = (password: Password) => {
		setSelectedPassword(password);
		setNewPassword({
			title: password.title,
			username: password.username,
			password: password.password,
			url: password.url || '',
			note: password.note || '',
		});
		setIsDialogOpen(true);
	};

	const handleFavorite = async (password: Password) => {
		try {
			console.log('Toggling favorite for password:', password.id);

			// Update local state with toggled favorite status
			const updatedPasswords = passwords.map((p) =>
				p.id === password.id ? { ...p, isFavorite: !p.isFavorite } : p
			);
			console.log('Updated passwords after toggle:', updatedPasswords);
			setPasswords(updatedPasswords);

			// Send the updated favorite status to the backend
			await updatePassword(password.id, {
				isFavorite: !password.isFavorite,
			});

			toast.success('Password favorite status updated successfully');
		} catch (error) {
			console.error('Error updating favorite status:', error);

			// Rollback the local state update in case of an error
			setPasswords(
				passwords.map((p) =>
					p.id === password.id
						? { ...p, isFavorite: password.isFavorite }
						: p
				)
			);

			toast.error('Failed to update password favorite status');
		}
	};

	const handleDelete = async () => {
		if (selectedPassword) {
			await deletePassword(selectedPassword.id);
			setPasswords(passwords.filter((p) => p.id !== selectedPassword.id));
			setIsDeleteDialogOpen(false);
			setSelectedPassword(null);
		}
	};

	const handleCloseDialog = () => {
		setIsDialogOpen(false);
		setSelectedPassword(null);
		setNewPassword({
			title: '',
			username: '',
			password: '',
			url: '',
			note: '',
		});
	};

	const filteredPasswords = passwords.filter(
		(password) =>
			password.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			password.username.toLowerCase().includes(searchTerm.toLowerCase())
	);

	const sortedPasswords = [...filteredPasswords].sort((a, b) => {
		const getValue = (password: Password, field: string) => {
			if (field === 'strength') {
				return getPasswordStrength(password.password).percentage;
			}
			return password[field as keyof Password] ?? '';
		};

		if (a.isFavorite !== b.isFavorite) {
			return a.isFavorite ? -1 : 1;
		}

		const valueA = getValue(a, sortOptions.field);
		const valueB = getValue(b, sortOptions.field);

		if (valueA < valueB) return sortOptions.order === 'asc' ? -1 : 1;
		if (valueA > valueB) return sortOptions.order === 'asc' ? 1 : -1;
		return 0;
	});

	return {
		passwords,
		loading,
		error,
		isLoggedIn,
		filteredPasswords,
		sortedPasswords,
		isDialogOpen,
		setIsDialogOpen,
		setSearchTerm,
		setSortOptions,
		handleEdit,
		handleFavorite,
		handleDelete,
		handleCloseDialog,
		handleAddOrUpdatePassword,
		isDeleteDialogOpen,
		setIsDeleteDialogOpen,
		selectedPassword,
		showPassword,
		setShowPassword,
		showUsername,
		setshowUsername,
		searchTerm,
		setSelectedPassword,
		setNewPassword,
		newPassword,
		sortOptions,
		setPasswords,
	};
};
