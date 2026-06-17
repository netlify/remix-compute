export default function ImagesDemo() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>Netlify Image CDN demo page</h1>
      <img src={`/.netlify/images?url=/camel.jpg&fit=cover&w=300&h=300&position=left`} alt="A camel" />
    </div>
  )
}
