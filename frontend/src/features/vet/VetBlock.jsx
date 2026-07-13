function VetBlock({ title, children }) {
  return (
    <section className="vet-block">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

export { VetBlock }
