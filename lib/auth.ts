import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './firebase-admin';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Check user in Firestore
          const usersRef = db.collection('users');
          const userQuery = await usersRef.where('email', '==', credentials.email).get();
          
          if (userQuery.empty) {
            return null;
          }

          const userDoc = userQuery.docs[0];
          const userData = userDoc.data();
          
          // Verify password
          const isValidPassword = await bcrypt.compare(credentials.password, userData.passwordHash);
          
          if (!isValidPassword) {
            return null;
          }

          return {
            id: userDoc.id,
            email: userData.email,
            name: userData.name,
            tenantId: userData.tenantId,
            role: userData.role || 'user',
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.sub as string) || session.user.id;
        session.user.tenantId = token.tenantId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key',
};
