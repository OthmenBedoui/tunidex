import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import ProfileForm from '../../components/store-client/account/ProfileForm';
import ProfileSecurityPanel from '../../components/store-client/account/ProfileSecurityPanel';
import ProfileSidebar from '../../components/store-client/account/ProfileSidebar';
import { StoreProfilePageProps } from '../../components/store-client/account/types';
import { api } from '../../services/api';

const ProfilePage: React.FC<StoreProfilePageProps> = ({ user, onUpdateUser, onDeleteAccountSuccess, navigateTo }) => {
  const nameParts = (user.fullName || '').trim().split(' ').filter(Boolean);
  const [username, setUsername] = useState(user.username);
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' '));
  const [phone, setPhone] = useState(user.phone || '');
  const [address, setAddress] = useState(user.address || '');
  const [paymentMethod, setPaymentMethod] = useState(user.paymentMethod || '');
  const [whatsappNumber, setWhatsappNumber] = useState(user.whatsappNumber || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState(user.email);
  const [emailOtp, setEmailOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [isEmailConfirming, setIsEmailConfirming] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const normalizedNewEmail = newEmail.trim().toLowerCase();
  const isEmailChangePending = normalizedNewEmail && normalizedNewEmail !== user.email.toLowerCase();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    if (password && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      setIsLoading(false);
      return;
    }

    try {
      const updatedUser = await api.updateProfile({
        username,
        avatarUrl,
        password: password || undefined,
        fullName: `${firstName} ${lastName}`.trim(),
        phone,
        address,
        paymentMethod,
        whatsappNumber
      });
      onUpdateUser(updatedUser);
      setMessage({ type: 'success', text: 'Profil mis a jour avec succes !' });
      setPassword('');
      setConfirmPassword('');
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la mise a jour du profil.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      await api.sendVerificationEmail();
      setMessage({ type: 'success', text: 'Email de verification envoye !' });
    } catch {
      setMessage({ type: 'error', text: "Erreur lors de l'envoi de l'email." });
    }
  };

  const handleRequestEmailChange = async () => {
    if (!isEmailChangePending) {
      setMessage({ type: 'error', text: 'Saisissez une nouvelle adresse email differente.' });
      return;
    }

    setIsEmailSending(true);
    setMessage({ type: '', text: '' });
    try {
      await api.requestEmailChange(normalizedNewEmail);
      setMessage({ type: 'success', text: 'Code envoye au nouveau email. Saisissez le code pour confirmer le changement.' });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : "Impossible d'envoyer le code." });
    } finally {
      setIsEmailSending(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    if (!isEmailChangePending || !emailOtp.trim()) {
      setMessage({ type: 'error', text: 'Nouvel email et code OTP obligatoires.' });
      return;
    }

    setIsEmailConfirming(true);
    setMessage({ type: '', text: '' });
    try {
      const updatedUser = await api.confirmEmailChange(normalizedNewEmail, emailOtp.trim());
      onUpdateUser(updatedUser);
      setNewEmail(updatedUser.email);
      setEmailOtp('');
      setMessage({ type: 'success', text: 'Adresse email mise a jour avec succes.' });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Code OTP invalide ou expire.' });
    } finally {
      setIsEmailConfirming(false);
    }
  };

  const handleDeleteAccount = async () => {
    setMessage({ type: '', text: '' });
    if (deleteConfirmation !== 'SUPPRIMER') {
      setMessage({ type: 'error', text: 'Veuillez saisir SUPPRIMER pour confirmer la suppression du compte.' });
      return;
    }

    setIsDeletingAccount(true);
    try {
      await api.deleteAccount(deleteConfirmation);
      onDeleteAccountSuccess();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la suppression du compte.' });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 flex items-center">
          <UserIcon className="mr-3 text-indigo-600" size={32} /> Mon Profil
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ProfileSidebar
            user={user}
            avatarUrl={avatarUrl}
            phone={phone}
            address={address}
            onGoOrders={() => navigateTo('user-dashboard')}
            onVerifyEmail={handleVerifyEmail}
          />
        </div>

        <div className="lg:col-span-2">
          <ProfileForm
            username={username}
            firstName={firstName}
            lastName={lastName}
            phone={phone}
            address={address}
            paymentMethod={paymentMethod}
            whatsappNumber={whatsappNumber}
            avatarUrl={avatarUrl}
            password={password}
            confirmPassword={confirmPassword}
            newEmail={newEmail}
            emailOtp={emailOtp}
            userEmail={user.email}
            isEmailVerified={Boolean(user.emailVerified)}
            isEmailChangePending={Boolean(isEmailChangePending)}
            isLoading={isLoading}
            isEmailSending={isEmailSending}
            isEmailConfirming={isEmailConfirming}
            message={message}
            onSubmit={handleUpdateProfile}
            onUsernameChange={setUsername}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onPhoneChange={setPhone}
            onAddressChange={setAddress}
            onPaymentMethodChange={setPaymentMethod}
            onWhatsappNumberChange={setWhatsappNumber}
            onAvatarUrlChange={setAvatarUrl}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onNewEmailChange={setNewEmail}
            onEmailOtpChange={setEmailOtp}
            onRequestEmailChange={handleRequestEmailChange}
            onConfirmEmailChange={handleConfirmEmailChange}
          />
          <ProfileSecurityPanel
            deleteConfirmation={deleteConfirmation}
            isDeletingAccount={isDeletingAccount}
            onDeleteConfirmationChange={setDeleteConfirmation}
            onDeleteAccount={handleDeleteAccount}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
