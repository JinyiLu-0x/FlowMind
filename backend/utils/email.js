export const sendEmail = async ({ to, subject, html }) => {
  // 开发期：打印到控制台
  console.log('\n--- Mock Email ---');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('HTML:', html);
  console.log('--- End Email ---\n');
  return true;
};


