import clsx from 'clsx'
import { useEffect, useId, useMemo } from 'react'
import { useFetcher } from '@remix-run/react'

import { Heading, ProductCard, Skeleton, Text } from '~/components'
import { usePrefixPathWithLocale } from '~/lib/utils'

/**
 * Display a grid of products and a heading based on some options.
 * This components uses the storefront API products query
 * @param count number of products to display
 * @param query a filtering query
 * @param reverse wether to reverse the product results
 * @param sortKey Sort the underlying list by the given key.
 * @see query https://shopify.dev/api/storefront/2023-04/queries/products
 * @see filters https://shopify.dev/api/storefront/2023-04/queries/products#argument-products-query
 */
export function FeaturedProducts({
  count = 4,
  heading = 'Shop Best Sellers',
  layout = 'drawer',
  onClose,
  query,
  reverse,
  sortKey = 'BEST_SELLING',
}) {
  const { load, data } = useFetcher()
  const queryString = useMemo(
    () =>
      Object.entries({ count, sortKey, query, reverse })
        .map(([key, val]) => (val ? `${key}=${val}` : null))
        .filter(Boolean)
        .join('&'),
    [count, sortKey, query, reverse],
  )
  const productsApiPath = usePrefixPathWithLocale(`/api/products?${queryString}`)

  useEffect(() => {
    load(productsApiPath)
  }, [load, productsApiPath])

  return (
    <>
      <Heading format size="copy" className="t-4">
        {heading}
      </Heading>
      <div
        className={clsx([`grid grid-cols-2 gap-x-6 gap-y-8`, layout === 'page' ? 'md:grid-cols-4 sm:grid-col-4' : ''])}
      >
        <FeatureProductsContent count={count} onClick={onClose} products={data?.products} />
      </div>
    </>
  )
}

/**
 * Render the FeaturedProducts content based on the fetcher's state. "loading", "empty" or "products"
 */
function FeatureProductsContent({ count = 4, onClick, products }) {
  const id = useId()

  if (!products) {
    return (
      <>
        {[...new Array(count)].map((_, i) => (
          <div key={`${id + i}`} className="grid gap-2">
            <Skeleton className="aspect-[3/4]" />
            <Skeleton className="w-32 h-4" />
          </div>
        ))}
      </>
    )
  }

  if (products?.length === 0) {
    return <Text format>No products found.</Text>
  }

  return (
    <>
      {products.map((product) => (
        <ProductCard product={product} key={product.id} onClick={onClick} quickAdd />
      ))}
    </>
  )
}
