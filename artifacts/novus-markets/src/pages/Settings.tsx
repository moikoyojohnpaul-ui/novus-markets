import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { MainLayout } from '@/components/layout/MainLayout';
import { useGetMe, useUpdateProfile, useGetKycStatus, useSubmitKyc, useGetSessions, useChangePassword, useToggle2fa, getGetMeQueryKey, getGetKycStatusQueryKey } from '@workspace/api-client-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Upload, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  preferredCurrency: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export default function Settings() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const { data: kycStatus } = useGetKycStatus({ query: { enabled: isAuthenticated } });
  const { data: sessions = [] } = useGetSessions({ query: { enabled: isAuthenticated } });

  const updateProfile = useUpdateProfile();
  const submitKyc = useSubmitKyc();
  const changePassword = useChangePassword();
  const toggle2fa = useToggle2fa();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      preferredCurrency: user?.preferredCurrency || 'USD'
    }
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '' }
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        preferredCurrency: user.preferredCurrency || 'USD'
      });
    }
  }, [user, profileForm]);

  const onProfileSubmit = (data: z.infer<typeof profileSchema>) => {
    updateProfile.mutate({ data }, {
      onSuccess: () => {
        toast({ title: 'Profile Updated' });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: 'Failed', description: err.message, variant: 'destructive' });
      }
    });
  };

  const onPasswordSubmit = (data: z.infer<typeof passwordSchema>) => {
    changePassword.mutate({ data }, {
      onSuccess: () => {
        toast({ title: 'Password Changed' });
        passwordForm.reset();
      },
      onError: (err: any) => {
        toast({ title: 'Failed', description: err.message, variant: 'destructive' });
      }
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocType, setSelectedDocType] = useState<'national_id' | 'passport' | 'drivers_license'>('national_id');

  const handleKycClick = (docType: 'national_id' | 'passport' | 'drivers_license') => {
    setSelectedDocType(docType);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 5MB', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      submitKyc.mutate({
        data: {
          documentType: selectedDocType,
          documentData: base64
        }
      }, {
        onSuccess: () => {
          toast({ title: 'KYC Submitted', description: 'Your documents are under review.' });
          queryClient.invalidateQueries({ queryKey: getGetKycStatusQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: 'Failed', description: err.message, variant: 'destructive' });
        }
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handle2FAToggle = (enabled: boolean) => {
    toggle2fa.mutate({ data: { enabled } }, {
      onSuccess: () => {
        toast({ title: enabled ? '2FA Enabled' : '2FA Disabled' });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: 'Failed', description: err.message, variant: 'destructive' });
      }
    });
  };

  if (isLoading) return <MainLayout><div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
  if (!isAuthenticated || !user) return null;

  const kycStatusBadge = {
    unverified: { label: 'Unverified', variant: 'secondary' as const, icon: <XCircle className="w-4 h-4" /> },
    pending: { label: 'Pending Review', variant: 'outline' as const, icon: <Clock className="w-4 h-4" /> },
    verified: { label: 'Verified', variant: 'default' as const, icon: <CheckCircle2 className="w-4 h-4" /> },
    rejected: { label: 'Rejected', variant: 'destructive' as const, icon: <XCircle className="w-4 h-4" /> },
  };

  const currentStatus = kycStatus?.status || 'unverified';
  const statusInfo = kycStatusBadge[currentStatus];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold mb-4">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile, security, and KYC verification.</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto h-12 mb-8">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="kyc">KYC</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="glass p-8 rounded-2xl max-w-2xl mx-auto">
              <h2 className="text-xl font-display font-semibold mb-6">Personal Information</h2>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="preferredCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Currency</FormLabel>
                        <FormControl>
                          <Input className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-12" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    Save Changes
                  </Button>
                </form>
              </Form>
            </div>
          </TabsContent>

          <TabsContent value="kyc" className="space-y-6">
            <div className="glass p-8 rounded-2xl max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-semibold">KYC Verification</h2>
                <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                  {statusInfo.icon}
                  {statusInfo.label}
                </Badge>
              </div>
              
              {currentStatus === 'unverified' && (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm">Upload a government-issued ID to unlock higher deposit & withdrawal limits.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {['national_id', 'passport', 'drivers_license'].map(docType => (
                      <Button
                        key={docType}
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center gap-2 glass-hover"
                        onClick={() => handleKycClick(docType as any)}
                        disabled={submitKyc.isPending}
                      >
                        <Upload className="w-6 h-6" />
                        <span className="text-xs">{docType.replace('_', ' ').toUpperCase()}</span>
                      </Button>
                    ))}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                </div>
              )}
              
              {currentStatus === 'pending' && (
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                  <p>Your documents are under review. This usually takes 1-2 business days.</p>
                </div>
              )}
              
              {currentStatus === 'verified' && (
                <div className="text-center py-6 text-success">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
                  <p>Your account is fully verified!</p>
                </div>
              )}
              
              {currentStatus === 'rejected' && (
                <div className="text-center py-6 text-destructive">
                  <XCircle className="w-12 h-12 mx-auto mb-3" />
                  <p className="mb-4">{kycStatus?.rejectionReason || 'Your submission was rejected. Please re-submit valid documents.'}</p>
                  <Button onClick={() => handleKycClick('national_id')} disabled={submitKyc.isPending}>
                    Re-submit Documents
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="glass p-8 rounded-2xl max-w-2xl mx-auto space-y-8">
              <div>
                <h2 className="text-xl font-display font-semibold mb-6">Change Password</h2>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full h-12" disabled={changePassword.isPending}>
                      {changePassword.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                      Update Password
                    </Button>
                  </form>
                </Form>
              </div>

              <div className="border-t border-border pt-8">
                <h2 className="text-xl font-display font-semibold mb-6">Two-Factor Authentication</h2>
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Enable 2FA</p>
                      <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                  </div>
                  <Switch 
                    checked={user.twoFaEnabled} 
                    onCheckedChange={handle2FAToggle}
                    disabled={toggle2fa.isPending}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <div className="glass p-8 rounded-2xl max-w-2xl mx-auto">
              <h2 className="text-xl font-display font-semibold mb-6">Active Sessions</h2>
              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No active sessions</p>
                ) : (
                  sessions.map(session => (
                    <div key={session.id} className="p-4 bg-background/50 rounded-lg border border-border flex items-center justify-between">
                      <div>
                        <p className="font-medium">{session.device}</p>
                        <p className="text-xs text-muted-foreground">{session.ipAddress} • {session.location || 'Unknown location'}</p>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(session.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                      {session.isCurrent && <Badge variant="outline">Current</Badge>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
