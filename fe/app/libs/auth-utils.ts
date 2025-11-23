export async function logout(): Promise<void> {
  try {
    await fetch('/api/v1/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fail to logout:', error);
  } finally {
    window.location.href = '/signin';
  }
}
