interface SkipForwardButtonProps {
    SkipTrack: any
}

function SkipForwardButton(props: SkipForwardButtonProps) {
    return (
        <button className="player__skip" onClick={() => props.SkipTrack()} aria-label="Skip Forwards">
            <svg role="img" height='16' width='16' viewBox="0 0 16 16">
                <path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-1.6z"></path>
            </svg>
        </button>
    )
}

export default SkipForwardButton