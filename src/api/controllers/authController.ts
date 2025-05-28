import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '@core/models/userModel.js';
import { IUser } from '@core/models/userModel.js';

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username: string; password: string };
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user: IUser = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).send('User registered successfully');
  } catch (error) {
    res.status(500).send('Server error');
  }
};

/**
 * Login user (with hardcoded admin support)
 */
export const login = async (req: Request, res: Response): Promise<any> => {
  const { username, password } = req.body as { username: string; password: string };

  // Hardcoded username and password for 'admin'
  const hardcodedUsername = 'admin';
  const hardcodedPassword = 'admin';

  try {
    // If the username is 'admin', check hardcoded password
    if (username === hardcodedUsername) {
      const isMatch = password === hardcodedPassword;
      if (!isMatch) return res.status(400).send('Invalid credentials');

      // Generate JWT token for admin user
      const token = jwt.sign(
        { username: hardcodedUsername, role: 'admin' },
        process.env.JWT_SECRET as string,
        { expiresIn: '1h' }
      );
      return res.json({ token });
    }

    // For other users, check in the database
    const user = await User.findOne({ username }) as IUser | null;
    if (!user) return res.status(400).send('User not found');

    // Compare the entered password with the hashed password from the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send('Invalid credentials');

    // Generate JWT token for authenticated user
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );
    res.json({ token });

  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

export default { register, login };