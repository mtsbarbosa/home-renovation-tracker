import { Router } from 'express';
import { signin, signup, signout } from '../../controllers/authController.js';

export function createAuthPortInRoutes(): Router {
  const router = Router();

  router.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const { token, error, errorCode } = await signin({ email, password });
    if (error) {
      return res.status(errorCode || 500).json({ message: error });
    } else {
      res.json({ message: 'Signed in successfully', token });
    }
  });

  router.post('/signup', async (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'Email, password, name, and role are required' });
    }
    const { error, errorCode } = await signup({ email, password, name, role });
    if (error) {
      return res.status(errorCode || 500).json({ message: error });
    }
    res.json({ message: 'User created successfully' });
  });

  router.post('/signout', async (req, res) => {
    const { token } = req.body;
    await signout({ token });
    res.json({ message: 'Signed out successfully' });
  });

  return router;
}
