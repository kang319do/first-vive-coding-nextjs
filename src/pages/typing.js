export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/study-zone/typing',
      permanent: false,
    },
  };
}

export default function TypingRedirect() {
  return null;
}
