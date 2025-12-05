import React, { useState, useEffect } from "react";
import { Keyboard } from "lucide-react";

interface HotkeyInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Auto-detecting hotkey input component
 * Captures keyboard shortcuts when focused
 */
export const HotkeyInput: React.FC<HotkeyInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "Click and press keys...",
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRecording) return;

    e.preventDefault();
    e.stopPropagation();

    const newKeys = new Set(pressedKeys);

    // Add modifier keys
    if (e.ctrlKey) newKeys.add("Ctrl");
    if (e.shiftKey) newKeys.add("Shift");
    if (e.altKey) newKeys.add("Alt");
    if (e.metaKey) newKeys.add("Cmd");

    // Add the actual key (not modifier keys)
    const key = e.key;
    if (!["Control", "Shift", "Alt", "Meta"].includes(key)) {
      // Format the key nicely
      const formattedKey = key.length === 1 ? key.toUpperCase() : key;
      newKeys.add(formattedKey);
    }

    setPressedKeys(newKeys);

    // Build the hotkey string
    const modifiers: string[] = [];
    const regularKeys: string[] = [];

    newKeys.forEach((k) => {
      if (["Ctrl", "Shift", "Alt", "Cmd"].includes(k)) {
        modifiers.push(k);
      } else {
        regularKeys.push(k);
      }
    });

    // Order: Ctrl, Shift, Alt, Cmd, then regular keys
    const orderedModifiers = ["Ctrl", "Shift", "Alt", "Cmd"].filter((m) =>
      modifiers.includes(m)
    );
    const hotkeyString = [...orderedModifiers, ...regularKeys].join("+");

    if (hotkeyString && regularKeys.length > 0) {
      onChange(hotkeyString);
    }
  };

  const handleKeyUp = () => {
    // Clear pressed keys on key up
    setPressedKeys(new Set());
  };

  const handleFocus = () => {
    setIsRecording(true);
    setPressedKeys(new Set());
  };

  const handleBlur = () => {
    setIsRecording(false);
    setPressedKeys(new Set());
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Keyboard size={18} />
        </div>
        <input
          type="text"
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          readOnly
          placeholder={placeholder}
          className={`
            w-full pl-10 pr-3 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            dark:bg-gray-800 dark:border-gray-600 dark:text-white
            ${isRecording ? "ring-2 ring-primary-500 border-primary-500" : ""}
            cursor-pointer
          `}
        />
        {isRecording && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
              Press keys...
            </span>
          </div>
        )}
      </div>
      {isRecording && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Press any combination of keys (e.g., Ctrl+Shift+R)
        </p>
      )}
    </div>
  );
};
