export default function Tooltip({ message, children }: { message: string, children: React.ReactNode }) {
    return (
    <div className="group relative flex">
        {children}
        <span className="absolute  scale-0 transition-all rounded bg-gray-100 p-2 text-xs text-black group-hover:scale-100">{message}</span>
    </div>
    )
}