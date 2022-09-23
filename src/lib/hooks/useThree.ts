import RUAThree, { defaultProps, ThreeProps } from 'lib/three';
import { useEffect, useRef } from 'react';

export type InitFn = (three: RUAThree) => void;
type Props = {
  init: InitFn;
} & ThreeProps;

const useThree = (props: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const three = useRef<RUAThree>();

  useEffect(() => {
    // When React created the canvas element.
    // pass to renderer
    const threeProps = {
      ...defaultProps,
      canvas: ref.current,
    };
    three.current = new RUAThree(
      props ? { ...threeProps, ...props } : threeProps
    );

    props.init(three.current);

    // Cleanup
    return () => {
      three.current?.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    three: three.current,
    ref,
  };
};

export default useThree;
export { THREE } from 'lib/three';
