const { useState } = React;

function YourComponent({ initialProp = 0 }) {
  const [state, setState] = useState(initialProp);

  return (
    <div>
      {/* Your component JSX */}
      <h1 style={{
                backgroundColor: "lightblue",
                width: "fit-content"
            }}>
                GeeksforGeeks
            </h1>

            <h2 style={{
                backgroundColor: "lightgrey",
                width: "fit-content"
            }}>
                A Computer Science portal for geeks.
                It contains well written, well
                thought and well explained computer
                science and programming articles
            </h2>

            <h3>Your truly, {writer}</h3>
    </div>
  );
}

// Auto-mount when the script loads
document.addEventListener('DOMContentLoaded', function() {
  const containers = document.querySelectorAll('[data-component="your-component"]');
  containers.forEach(container => {
    const props = JSON.parse(container.getAttribute('data-props') || '{}');
    const root = ReactDOM.createRoot(container);
    root.render(<YourComponent {...props} />);
  });
});
