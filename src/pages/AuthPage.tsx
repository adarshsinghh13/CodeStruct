import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase, adminSupabase } from '@/integrations/supabase/client';
import { checkUserExists, manuallyConfirmUser } from '@/integrations/supabase/rpcTypes';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, User } from 'lucide-react';

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const navigate = useNavigate();
  const { user, refreshSession } = useAuth();

  // Normalize email input
  const normalizeEmail = (email: string) => email.trim().toLowerCase();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Save user data to profiles table
  const saveUserProfile = async (userId, userData) => {
    try {
      console.log('Attempting to save user profile for:', userId);
      
      // Try up to 3 times to save the profile
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Check if profile already exists
          const { data: existingProfile, error: checkError } = await supabase
            .from('profiles')
            .select()
            .eq('id', userId)
            .single();
          
          if (checkError && checkError.code !== 'PGRST116') { // Not PGRST116 = not "no rows returned"
            console.error(`Error checking for existing profile (attempt ${attempt}):`, checkError);
            if (attempt === 3) throw checkError;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
            continue;
          }

          if (!existingProfile) {
            // Insert user data into the profiles table
            console.log('Profile does not exist, creating new one');
            const { error } = await supabase
              .from('profiles')
              .insert([
                { 
                  id: userId, 
                  full_name: userData.full_name,
                  email: userData.email,
                  created_at: new Date().toISOString()
                }
              ]);
              
            if (error) {
              console.error(`Error saving user profile (attempt ${attempt}):`, error);
              if (attempt === 3) throw error;
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
              continue;
            }
            console.log('User profile saved successfully');
            return true;
          } else {
            console.log('User profile already exists');
            return true;
          }
        } catch (attemptError) {
          console.error(`Error in profile save attempt ${attempt}:`, attemptError);
          if (attempt === 3) throw attemptError;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        }
      }
    } catch (error) {
      console.error('Error in saveUserProfile:', error);
      // We don't want to throw here as it's not critical to authentication
      return false;
    }
  };

  // Special handler for account troubleshooting
  const handleDebug = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to troubleshoot.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const normalizedEmail = normalizeEmail(email);
      console.log('Troubleshooting account:', normalizedEmail);
      
      // Check if user exists
      const { data: checkData } = await (supabase.rpc as any)('check_user_exists', { 
        user_email: normalizedEmail 
      });
      
      console.log('Account check results:', checkData);
      
      if (checkData && checkData.exists) {
        // Attempt confirmation regardless
        console.log('Account found, attempting confirmation');
        
        // First try admin API if available
        if (adminSupabase) {
          try {
            const { error } = await adminSupabase.auth.admin.updateUserById(
              checkData.id || '',
              { email_confirm: true }
            );
            
            if (!error) {
              console.log('Account confirmed via admin API');
            } else {
              console.error('Admin API confirmation error:', error);
            }
          } catch (adminErr) {
            console.error('Error using admin API:', adminErr);
          }
        }
        
        // Also try RPC method
        try {
          const { error } = await (supabase.rpc as any)('manually_confirm_user', { 
            user_email: normalizedEmail 
          });
          
          if (!error) {
            console.log('Account confirmed via RPC');
          } else {
            console.error('RPC confirmation error:', error);
          }
        } catch (rpcErr) {
          console.error('Error using RPC method:', rpcErr);
        }
        
        toast({
          title: "Account Troubleshooting",
          description: `Account found and confirmation attempted. Please try signing in (account created: ${new Date(checkData.created_at || '').toLocaleDateString()})`,
        });
      } else {
        toast({
          title: "Account Not Found",
          description: "No account was found with this email address. Please sign up first.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error during troubleshooting:', error);
      toast({
        title: "Troubleshooting Error",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        console.log('Creating new user account:', email);
        
        // Validate password length
        if (password.length < 6) {
          toast({
            title: "Invalid Password",
            description: "Password must be at least 6 characters long",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        // Normalize the email
        const normalizedEmail = normalizeEmail(email);
        console.log('Using normalized email:', normalizedEmail);
        
        // Try with admin API first if available
        if (adminSupabase) {
          console.log('Using admin API for signup');
          const { data, error } = await adminSupabase.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
            }
          });
          
          if (error) {
            console.error('Admin API error:', error);
            throw error;
          }
          
          console.log('User created via admin API:', data);
          
          // Add a delay before signing in
          console.log('Waiting before sign-in attempt...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Sign in the user immediately
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password
          });
          
          if (signInError) {
            console.error('Error signing in after admin signup:', signInError);
            throw signInError;
          }
          
          if (signInData?.session) {
            // Save profile data
            await saveUserProfile(
              signInData.user.id, 
              { 
                full_name: fullName, 
                email: signInData.user.email 
              }
            );
            
            // Refresh session and navigate
            await refreshSession();
            
            toast({
              title: "Account created and verified!",
              description: "Welcome to CodeStruct!",
            });
            
            navigate('/');
          }
          
          return;
        }
        
        // Fallback to regular signup if admin API isn't available
        console.log('Using regular signup flow');
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: null
          }
        });
        
        if (error) {
          throw error;
        }

        console.log('New user created:', data);
        
        // If we have a session directly after signup, user is auto-confirmed
        if (data?.session) {
          console.log('Session available immediately - user is confirmed');
          await saveUserProfile(
            data.user.id, 
            { 
              full_name: fullName, 
              email: data.user.email 
            }
          );
          
          await refreshSession();
          
          toast({
            title: "Account created successfully!",
            description: "Welcome to CodeStruct!",
          });
          
          navigate('/');
          return;
        }
        
        // Otherwise, try to manually confirm the user via RPC
        try {
          console.log('Attempting to manually confirm user');
          const { error: verifyError } = await manuallyConfirmUser(normalizedEmail);
          
          if (verifyError) {
            console.error('Error during manual confirmation:', verifyError);
          } else {
            console.log('Manual confirmation was successful');
          }
          
          // Increase the delay significantly to ensure Supabase has processed the confirmation
          console.log('Waiting for Supabase to process account...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Try to sign in with increased error handling
          console.log('Attempting to sign in after manual confirmation');
          try {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password
            });
            
            if (signInError) {
              console.error('Error signing in after manual confirmation:', signInError);
              // Just proceed to the fallback message
              throw signInError;
            }
            
            if (signInData?.session) {
              // Save profile data
              await saveUserProfile(
                signInData.user.id, 
                { 
                  full_name: fullName, 
                  email: signInData.user.email 
                }
              );
              
              await refreshSession();
              
              toast({
                title: "Account created successfully!",
                description: "Welcome to CodeStruct!",
              });
              
              navigate('/');
              return;
            }
          } catch (signInErr) {
            console.log('Could not auto-sign in after confirmation, showing fallback message');
          }
          
          // If we reached here, the auto-signin failed - show friendly message
          toast({
            title: "Account created successfully!",
            description: "Please sign in with your email and password.",
            variant: "default",
          });
          setIsSignUp(false);
          return;
        } catch (confirmError) {
          console.error('Error during manual confirmation:', confirmError);
        }
        
        // If we get here, we couldn't auto-sign in, show a message to sign in manually
        toast({
          title: "Account created!",
          description: "Please try signing in with your credentials.",
        });
        setIsSignUp(false);
      } else {
        // Regular sign in - simple password-based auth
        console.log('Signing in user:', email);
        const normalizedEmail = normalizeEmail(email);
        
        // Try to sign in with the normalized email
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          
          if (error) {
            console.error('Sign in error:', error);
            
            // Increment login attempt counter
            setLoginAttempts(prev => prev + 1);
            
            if (error.message.includes('Invalid login credentials')) {
              // Check if user exists but isn't confirmed
              try {
                const { data: checkData } = await checkUserExists(normalizedEmail);
                console.log('User existence check:', checkData);
                
                if (checkData && checkData.exists) {
                  // Attempt to confirm account regardless of confirmation status
                  // This helps with edge cases where confirmation status is incorrect
                  console.log('Found user, attempting auto-confirmation');
                  
                  // Try to confirm with admin API first if available
                  if (adminSupabase) {
                    const { error: adminError } = await adminSupabase.auth.admin.updateUserById(
                      checkData.id || '',
                      { email_confirm: true }
                    );
                    
                    if (!adminError) {
                      console.log('User confirmed via admin API');
                    }
                  }
                  
                  // Also try with RPC method as backup
                  const { error: confirmError } = await manuallyConfirmUser(normalizedEmail);
                  
                  if (!confirmError) {
                    console.log('User confirmed via RPC');
                    // Wait a moment for confirmation to process
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // Try signing in one more time
                    const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                      email: normalizedEmail,
                      password,
                    });
                    
                    if (!retryError && retryData?.session) {
                      console.log('Sign-in successful after confirmation');
                      toast({
                        title: "Welcome back!",
                        description: "You have successfully signed in.",
                      });
                      
                      await refreshSession();
                      navigate('/');
                      return;
                    } else {
                      console.error('Still failed after confirmation attempt:', retryError);
                      
                      // Last resort - try with original non-normalized email
                      if (normalizedEmail !== email) {
                        console.log('Trying with original non-normalized email as last resort');
                        const { data: originalData, error: originalError } = await supabase.auth.signInWithPassword({
                          email,
                          password,
                        });
                        
                        if (!originalError && originalData?.session) {
                          console.log('Sign-in successful with original email');
                          toast({
                            title: "Welcome back!",
                            description: "You have successfully signed in.",
                          });
                          
                          await refreshSession();
                          navigate('/');
                          return;
                        }
                      }
                      
                      // If we've tried multiple times, suggest password reset
                      if (loginAttempts >= 2) {
                        toast({
                          title: "Still having trouble?",
                          description: "Your account exists but we can't sign you in. Please try resetting your password or contact support.",
                          variant: "destructive",
                        });
                      } else {
                        toast({
                          title: "Authentication Error",
                          description: "We've attempted to verify your account. Please try signing in again.",
                        });
                      }
                    }
                    return;
                  }
                } else {
                  // User doesn't exist
                  toast({
                    title: "Account not found",
                    description: "No account found with this email. Please check your email or sign up.",
                    variant: "destructive",
                  });
                  return;
                }
              } catch (checkError) {
                console.error('Error checking user existence:', checkError);
              }
            }
            
            // If we get here, show the error message
            throw error;
          }
          
          if (data?.session) {
            console.log('Successful sign in:', data.user?.email);
            
            // Refresh our auth context to make sure everything is up to date
            await refreshSession();
            
            toast({
              title: "Welcome back!",
              description: "You have successfully signed in.",
            });
            
            navigate('/');
          } else {
            console.warn('No session returned from sign in');
            throw new Error("Failed to create session");
          }
        } catch (error: any) {
          console.error('Authentication error:', error.message);
          toast({
            title: "Authentication Error",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error.message);
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) throw error;
      
      // Note: For Google Auth, the profile data will be saved when the user
      // is redirected back to the app via the onAuthStateChange handler in AuthContext
    } catch (error: any) {
      toast({
        title: "Google Sign-in Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dsa-purple/10 to-dsa-purple-light/10 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleAuth}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full bg-dsa-purple hover:bg-dsa-purple/90" disabled={loading}>
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-dsa-purple hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>
          
          <div className="text-center text-xs mt-4">
            <span className="text-muted-foreground">Having issues? </span>
            <button
              type="button"
              onClick={handleDebug}
              className="text-dsa-purple/90 hover:underline"
            >
              Troubleshoot my account
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
