import clsx from 'clsx'
import { flattenConnection, Image, Money, useMoney } from '@shopify/hydrogen'
import { Text, Link, AddToCartButton } from '~/components'
import { isDiscounted, isNewArrival } from '~/lib/utils'
import { getProductPlaceholder } from '~/lib/placeholders'

export function ProductCard({ product, label, className, loading, onClick, quickAdd }) {
  let cardLabel

  const cardProduct = product?.variants ? product : getProductPlaceholder()
  if (!cardProduct?.variants?.nodes?.length) return null

  const firstVariant = flattenConnection(cardProduct.variants)[0]

  if (!firstVariant) return null
  const { image, price, compareAtPrice } = firstVariant

  if (label) {
    cardLabel = label
  } else if (isDiscounted(price, compareAtPrice)) {
    cardLabel = 'Sale'
  } else if (isNewArrival(product.publishedAt)) {
    cardLabel = 'New'
  }

  const productAnalytics = {
    productGid: product.id,
    variantGid: firstVariant.id,
    name: product.title,
    variantName: firstVariant.title,
    brand: product.vendor,
    price: firstVariant.price.amount,
    quantity: 1,
  }

  return (
    <div className="flex flex-col gap-2">
      <Link onClick={onClick} to={`/products/${product.handle}`} prefetch="intent">
        <div className={clsx('grid gap-4', className)}>
          <div className="card-image aspect-[4/5] bg-primary/5">
            {image && (
              <Image
                className="object-cover w-full fadeIn"
                sizes="(min-width: 64em) 25vw, (min-width: 48em) 30vw, 45vw"
                aspectRatio="4/5"
                data={image}
                alt={image.altText || `Picture of ${product.title}`}
                loading={loading}
              />
            )}
            <Text as="label" size="fine" className="absolute top-0 right-0 m-4 text-right text-notice">
              {cardLabel}
            </Text>
          </div>
          <div className="grid gap-1">
            <Text className="w-full overflow-hidden whitespace-nowrap text-ellipsis " as="h3">
              {product.title}
            </Text>
            <div className="flex gap-4">
              <Text className="flex gap-4">
                <Money withoutTrailingZeros data={price} />
                {isDiscounted(price, compareAtPrice) && (
                  <CompareAtPrice className={'opacity-50'} data={compareAtPrice} />
                )}
              </Text>
            </div>
          </div>
        </div>
      </Link>
      {quickAdd && (
        <AddToCartButton
          lines={[
            {
              quantity: 1,
              merchandiseId: firstVariant.id,
            },
          ]}
          variant="secondary"
          className="mt-2"
          analytics={{
            products: [productAnalytics],
            totalValue: parseFloat(productAnalytics.price),
          }}
        >
          <Text as="span" className="flex items-center justify-center gap-2">
            Add to Cart
          </Text>
        </AddToCartButton>
      )}
    </div>
  )
}

function CompareAtPrice({ data, className }) {
  const { currencyNarrowSymbol, withoutTrailingZerosAndCurrency } = useMoney(data)

  const styles = clsx('strike', className)

  return (
    <span className={styles}>
      {currencyNarrowSymbol}
      {withoutTrailingZerosAndCurrency}
    </span>
  )
}
