import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { TextInput, type TextInputProps } from "react-native";

type FocusBlurHandlers = Pick<TextInputProps, "onFocus" | "onBlur">;

function chainHandler<E>(
  immersive: ((e: E) => void) | undefined,
  existing: ((e: E) => void) | undefined,
): ((e: E) => void) | undefined {
  if (!immersive && !existing) return undefined;
  return (e: E) => {
    immersive?.(e);
    existing?.(e);
  };
}

function injectNode(node: ReactNode, handlers: FocusBlurHandlers): ReactNode {
  if (node == null || typeof node === "boolean") return node;

  if (Array.isArray(node)) {
    return Children.map(node, (child) => injectNode(child, handlers));
  }

  if (!isValidElement(node)) return node;

  if (node.type === TextInput) {
    const el = node as ReactElement<TextInputProps>;
    return cloneElement(el, {
      onFocus: chainHandler(handlers.onFocus, el.props.onFocus),
      onBlur: chainHandler(handlers.onBlur, el.props.onBlur),
    });
  }

  if (node.type === Fragment) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return cloneElement(el, {}, injectNode(el.props.children, handlers));
  }

  const el = node as ReactElement<{ children?: ReactNode }>;
  if (el.props.children == null) return node;

  return cloneElement(el, {}, injectNode(el.props.children, handlers));
}

/** Attach immersive focus handlers to every TextInput under `children`. */
export function injectImmersiveTextInputHandlers(
  children: ReactNode,
  handlers: FocusBlurHandlers,
): ReactNode {
  return Children.map(Children.toArray(children), (child) => injectNode(child, handlers));
}
