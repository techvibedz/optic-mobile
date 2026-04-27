import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken } from '../api/config';
import { Alert } from 'react-native';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      console.log('Attempting login for:', email);
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const { token, user } = response.data;
      
      console.log('LOGIN RESPONSE RAW:', JSON.stringify(response.data));

      setUserToken(token);
      setUserInfo(user);
      
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      
      // Update API headers
      setAuthToken(token);
      
      console.log('Login successful. Token set:', token.substring(0, 10) + '...');

    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Failed', 
        error.response?.data?.error || 'Please check your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      setUserToken(null);
      setUserInfo(null);
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userInfo');
      setAuthToken(null);
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      let userToken = await AsyncStorage.getItem('userToken');
      let userInfo = await AsyncStorage.getItem('userInfo');

      if (userToken) {
        console.log('Restoring session. Token:', userToken.substring(0, 10) + '...');
        setUserToken(userToken);
        setUserInfo(JSON.parse(userInfo));
        setAuthToken(userToken);
        
        // Refresh user data in background to ensure it's up to date
        refreshUser();
      } else {
        console.log('No session found');
      }
    } catch (e) {
      console.error('IsLoggedIn error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      console.log('Refreshing user data...');
      const response = await api.post('/auth/verify');
      console.log('VERIFY RESPONSE RAW:', JSON.stringify(response.data));

      if (response.data && response.data.user) {
        console.log('User data refreshed:', response.data.user);
        // Ensure name is at least an empty string if null, to avoid crashes
        const refreshedUser = {
             ...response.data.user,
             name: response.data.user.name || ''
        };
        setUserInfo(refreshedUser);
        await AsyncStorage.setItem('userInfo', JSON.stringify(refreshedUser));
      } else {
        console.warn('Refresh user returned no user data:', response.data);
      }
    } catch (e) {
      console.error('Refresh user failed:', e);
      // If unauthorized, we should probably logout, but let's just log for now to avoid loops
    }
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  return (
    <AuthContext.Provider value={{ login, logout, isLoading, userToken, userInfo, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
