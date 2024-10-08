import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { updatedReviewThunk } from "../../store/reviews";
import { useModal } from "../../context/Modal";
import { FaStar, FaRegStar } from "react-icons/fa";


function EditReviewModal({ review, setReviewEditChecker }) {
    // console.log("THIS IS REVIEWS", review.review);
    const [reviewText, setReviewText] = useState(review.review);
    const [rating, setRating] = useState(review.stars);
    const [errors, setErrors] = useState({});
    const [showErrors, setShowErrors] = useState(false);
    const [buttonDisabled, setButtonDisabled] = useState(false)



    const dispatch = useDispatch();
    const { closeModal } = useModal();

    useEffect(() => {
        if (reviewText.length >= 10 && rating > 0)
            setButtonDisabled(false);
        else
            setButtonDisabled(true)
    }, [reviewText, rating])

    const handleStarClick = (starIndex) => {
        setRating(starIndex + 1);
    };

    const handleOnSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        setErrors([]);
        setShowErrors(false);

        return dispatch(updatedReviewThunk({
            id: review.id,
            review: reviewText,
            stars: rating
        }))
        .then(() => {
            setReviewEditChecker(true);
        })
        .then(closeModal)
        .catch(async (res) => {
            const data = await res.json();
            if(data?.errors) {
                setErrors(errors)
            }
        })
    };

    return (
        <div className="post-review-container">
            <form className="post-review-form" onSubmit={handleOnSubmit}>
                <h1>How was your stay?</h1>
                {showErrors ? <p>{errors.message}</p> : ''}
                <textarea
                    className="review-input"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Leave your review here..."
                />
                <div className='stars'>
                    {Array.from({ length: 5 }, (_, index) => (
                        <div className='post-reviewstar' key={index} onClick={() => handleStarClick(index)}>
                            {index < rating ? <FaStar /> : <FaRegStar />}
                        </div>
                    ))}
                </div>
                <button className="post-review-button" type="submit" disabled={buttonDisabled}>
                    Submit Your Review
                </button>
            </form>
        </div>
    );

}

export default EditReviewModal;
