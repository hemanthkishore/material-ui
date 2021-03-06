import React from 'react';
import PropTypes from 'prop-types';
import { useForkRef } from '../utils/reactHelpers';
import debounce from 'debounce'; // < 1kb payload overhead when lodash/debounce is > 3kb.

function getStyleValue(computedStyle, property) {
  return parseInt(computedStyle[property], 10) || 0;
}

const useEnhancedEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

/**
 * @ignore - internal component.
 *
 * To make public in v4+.
 */
const Textarea = React.forwardRef(function Textarea(props, ref) {
  const { onChange, rowsMax, rowsMin, style, value, ...other } = props;

  const { current: isControlled } = React.useRef(value != null);
  const inputRef = React.useRef();
  const [state, setState] = React.useState({});
  const handleRef = useForkRef(ref, inputRef);

  const syncHeight = React.useCallback(() => {
    const input = inputRef.current;
    const savedValue = input.value;
    const savedHeight = input.style.height;
    const savedOverflow = input.style.overflow;

    input.style.overflow = 'hidden';
    input.style.height = '0';

    // The height of the inner content
    input.value = savedValue || props.placeholder || 'x';
    const innerHeight = input.scrollHeight;

    const computedStyle = window.getComputedStyle(input);
    const boxSizing = computedStyle['box-sizing'];

    // Measure height of a textarea with a single row
    input.value = 'x';
    const singleRowHeight = input.scrollHeight;

    // The height of the outer content
    let outerHeight = innerHeight;

    if (rowsMin != null) {
      outerHeight = Math.max(Number(rowsMin) * singleRowHeight, outerHeight);
    }
    if (rowsMax != null) {
      outerHeight = Math.min(Number(rowsMax) * singleRowHeight, outerHeight);
    }
    outerHeight = Math.max(outerHeight, singleRowHeight);

    if (boxSizing === 'content-box') {
      outerHeight -=
        getStyleValue(computedStyle, 'padding-bottom') +
        getStyleValue(computedStyle, 'padding-top');
    } else if (boxSizing === 'border-box') {
      outerHeight +=
        getStyleValue(computedStyle, 'border-bottom-width') +
        getStyleValue(computedStyle, 'border-top-width');
    }

    input.style.overflow = savedOverflow;
    input.style.height = savedHeight;
    input.value = savedValue;

    setState(prevState => {
      // Need a large enough different to update the height.
      // This prevents infinite rendering loop.
      if (innerHeight > 0 && Math.abs((prevState.innerHeight || 0) - innerHeight) > 1) {
        return {
          innerHeight,
          outerHeight,
        };
      }

      return prevState;
    });
  }, [setState, rowsMin, rowsMax, props.placeholder]);

  React.useEffect(() => {
    const handleResize = debounce(() => {
      syncHeight();
    }, 166); // Corresponds to 10 frames at 60 Hz.

    window.addEventListener('resize', handleResize);
    return () => {
      handleResize.clear();
      window.removeEventListener('resize', handleResize);
    };
  }, [syncHeight]);

  useEnhancedEffect(() => {
    syncHeight();
  });

  const handleChange = event => {
    if (!isControlled) {
      syncHeight();
    }

    if (onChange) {
      onChange(event);
    }
  };

  return (
    <textarea
      value={value}
      onChange={handleChange}
      ref={handleRef}
      style={{
        height: state.outerHeight,
        overflow: state.outerHeight === state.innerHeight ? 'hidden' : null,
        ...style,
      }}
      {...other}
    />
  );
});

Textarea.propTypes = {
  /**
   * @ignore
   */
  className: PropTypes.string,
  /**
   * @ignore
   */
  onChange: PropTypes.func,
  /**
   * @ignore
   */
  placeholder: PropTypes.string,
  /**
   * Maximum number of rows to display when multiline option is set to true.
   */
  rowsMax: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /**
   * Minimum number of rows to display when multiline option is set to true.
   */
  rowsMin: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /**
   * @ignore
   */
  style: PropTypes.object,
  /**
   * @ignore
   */
  value: PropTypes.any,
};

export default Textarea;
