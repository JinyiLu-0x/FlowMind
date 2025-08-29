export const validateEmail = (email) => {
  const re = /^\S+@\S+\.\S+$/;
  return re.test(String(email).toLowerCase());
};

export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return { isValid: false, message: '密码至少6个字符' };
  }
  return { isValid: true, message: 'OK' };
};


