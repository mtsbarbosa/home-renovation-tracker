export type SignInRequest = {
  email: string;
  password: string;
};

export type SignUpRequest = {
  email: string;
  password: string;
  name: string;
  role: string;
};

export type SignOutRequest = {
  token: string;
};
