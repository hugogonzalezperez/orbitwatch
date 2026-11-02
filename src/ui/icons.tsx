// Iconos dibujados a mano en una rejilla de 16 px; heredan el color del texto.
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" fill="currentColor">
    <path d={d} />
  </svg>
)

export const RewindIcon = () => <Icon d="M8 3 1.5 8 8 13Zm6.5 0L8 8l6.5 5Z" />
export const ForwardIcon = () => <Icon d="M8 3l6.5 5L8 13Zm-6.5 0L8 8l-6.5 5Z" />
export const PauseIcon = () => <Icon d="M4 3h3v10H4Zm5 0h3v10H9Z" />
export const PlayIcon = () => <Icon d="M4.5 2.5 13 8l-8.5 5.5Z" />
export const CloseIcon = () => <Icon d="M3.7 2.3 8 6.6l4.3-4.3 1.4 1.4L9.4 8l4.3 4.3-1.4 1.4L8 9.4l-4.3 4.3-1.4-1.4L6.6 8 2.3 3.7Z" />
export const ChevronRightIcon = () => <Icon d="M5.5 2.5 4.1 4l4 4-4 4 1.4 1.5L11 8Z" />
