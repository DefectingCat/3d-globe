import useThree from 'lib/hooks/useThree';

const initThree = () => {};

function App() {
  const { ref } = useThree({ init: initThree });

  return (
    <>
      <canvas ref={ref}></canvas>
    </>
  );
}

export default App;
