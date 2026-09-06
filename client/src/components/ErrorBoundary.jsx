import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render error caught by ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <h2>Something broke on this page</h2>
          <p style={{ color: 'var(--brown-soft)', marginTop: 12 }}>
            {this.state.error.message || String(this.state.error)}
          </p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
