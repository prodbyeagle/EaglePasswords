import { Password } from '@/types';
import { PasswordCard } from './PasswordCard';

interface PasswordListProps {
	passwords: Password[];
	showPassword: { [key: string]: boolean };
	setShowPassword: (show: { [key: string]: boolean }) => void;
	showUsername: { [key: string]: boolean };
	setshowUsername: (show: { [key: string]: boolean }) => void;
	handleEdit: (password: Password) => void;
	handleFavorite: (password: Password) => void;
	handleDelete: (password: Password) => void;
}

export const PasswordList = ({
	passwords,
	showPassword,
	setShowPassword,
	showUsername,
	setshowUsername,
	handleEdit,
	handleFavorite,
	handleDelete,
}: PasswordListProps) => (
	<div className='grid gap-3 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 p-4'>
		{passwords.map((password: Password) => (
			<PasswordCard
				key={password.id}
				password={password}
				showPassword={showPassword}
				setShowPassword={setShowPassword}
				showUsername={showUsername}
				setshowUsername={setshowUsername}
				handleEdit={handleEdit}
				handleFavorite={handleFavorite}
				handleDelete={handleDelete}
			/>
		))}
	</div>
);
